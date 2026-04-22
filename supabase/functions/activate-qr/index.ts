import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, userEmail } = await req.json()
    
    // Obtener el token de autorización
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorización requerido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener el usuario actual desde el JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Activating QR for user id: ${user.id}`)

    // 1. Buscar la tarjeta QR por código
    console.log('Looking up QR card')
    const { data: qrCard, error: qrError } = await supabaseClient
      .from('qr_cards')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    // Verificar si la tarjeta existe
    if (qrError) {
      console.error('Error searching QR card:', qrError)
      return new Response(
        JSON.stringify({ 
          error: 'Error al buscar la tarjeta QR',
          details: qrError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!qrCard) {
      console.log('QR card not found')
      return new Response(
        JSON.stringify({ 
          error: 'Tarjeta QR no encontrada' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar si ya está activada
    if (qrCard.is_activated) {
      console.log('QR card already activated, checking ownership')

      // Caso 1: la tarjeta ya pertenece al usuario actual (compra digital o activación previa)
      if (qrCard.owner_user_id === user.id || qrCard.activated_by === user.id) {
        console.log('Card already belongs to this user')
        return new Response(
          JSON.stringify({
            success: true,
            credits: qrCard.download_credits,
            cardType: qrCard.card_type,
            message: 'Esta tarjeta ya está en tu biblioteca',
            alreadyOwned: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Caso 2: pertenece a otro usuario → comprobar créditos legacy en user_credits
      const { data: existingCredits, error: creditsError } = await supabaseClient
        .from('user_credits')
        .select('*')
        .eq('user_email', user.email!)
        .eq('card_id', code)
        .eq('is_active', true)
        .maybeSingle()

      if (creditsError) {
        console.error('Error checking existing credits:', creditsError)
        return new Response(
          JSON.stringify({ error: 'Error verificando créditos existentes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingCredits && existingCredits.credits_remaining > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            credits: existingCredits.credits_remaining,
            cardType: existingCredits.card_type,
            message: 'Tienes créditos activos de esta tarjeta',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('QR card already used by another user')
      return new Response(
        JSON.stringify({ error: 'Esta tarjeta QR ya ha sido utilizada por otro usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Calcular fecha de expiración (30 días desde ahora)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 4. Crear registro de créditos para el usuario
    console.log('Creating credits row')
    const { error: creditsError } = await supabaseClient
      .from('user_credits')
      .insert({
        user_email: user.email,
        card_id: qrCard.code,
        card_type: qrCard.card_type,
        max_credits: qrCard.download_credits,
        credits_remaining: qrCard.download_credits,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })

    if (creditsError) {
      console.error('Error creating credits:', creditsError)
      return new Response(
        JSON.stringify({ 
          error: 'Error al activar créditos',
          details: creditsError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 5. Marcar la tarjeta QR como activada
    console.log('Marking QR card as activated')
    const { error: updateError } = await supabaseClient
      .from('qr_cards')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        activated_by: user.id
      })
      .eq('id', qrCard.id)

    if (updateError) {
      console.error('Error updating QR card:', updateError)
      // No devolver error aquí porque los créditos ya se crearon exitosamente
    }

    console.log('QR activation successful')
    return new Response(
      JSON.stringify({
        success: true,
        message: `Tarjeta ${qrCard.card_type} activada correctamente`,
        credits: qrCard.download_credits,
        cardType: qrCard.card_type,
        expiresAt: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
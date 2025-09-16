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

    console.log(`Activating QR for user: ${user.email} (${user.id})`)

    // 1. Buscar la tarjeta QR por código
    console.log(`Looking for QR card with code: ${code}`)
    const { data: qrCard, error: qrError } = await supabaseClient
      .from('qr_cards')
      .select('*')
      .eq('code', code)
      .eq('is_activated', false)
      .single()

    if (qrError || !qrCard) {
      console.error('QR card not found:', qrError)
      return new Response(
        JSON.stringify({ 
          error: 'Tarjeta QR no encontrada o ya activada',
          details: qrError?.message 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Found QR card: ${qrCard.card_type} with ${qrCard.download_credits} credits`)

    // 2. Verificar si el usuario ya tiene créditos activos
    const { data: existingCredits } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_email', user.email)
      .eq('is_active', true)
      .gt('credits_remaining', 0)
      .maybeSingle()

    if (existingCredits) {
      console.log('User already has active credits')
      return new Response(
        JSON.stringify({ 
          error: 'Ya tienes créditos activos. Úsalos antes de activar una nueva tarjeta.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. Calcular fecha de expiración (30 días desde ahora)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 4. Crear registro de créditos para el usuario
    console.log(`Creating credits for user: ${user.email}`)
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
    console.log(`Marking QR card as activated`)
    const { error: updateError } = await supabaseClient
      .from('qr_cards')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        activated_by: user.id // Usar UUID del usuario, no email
      })
      .eq('id', qrCard.id)

    if (updateError) {
      console.error('Error updating QR card:', updateError)
      // No devolver error aquí porque los créditos ya se crearon exitosamente
    }

    console.log(`QR activation successful for ${user.email}`)
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
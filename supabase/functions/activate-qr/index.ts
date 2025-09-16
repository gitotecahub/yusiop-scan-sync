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

    // Create supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar la tarjeta QR por código
    const { data: qrCard, error: qrError } = await supabaseClient
      .from('qr_cards')
      .select('*')
      .eq('code', code)
      .eq('is_activated', false)
      .single()

    if (qrError || !qrCard) {
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

    // 2. Verificar si el usuario ya tiene créditos activos
    const { data: existingCredits } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_active', true)
      .gt('credits_remaining', 0)
      .single()

    if (existingCredits) {
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
    const { error: creditsError } = await supabaseClient
      .from('user_credits')
      .insert({
        user_email: userEmail,
        card_id: qrCard.code,
        card_type: qrCard.card_type,
        max_credits: qrCard.download_credits,
        credits_remaining: qrCard.download_credits,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })

    if (creditsError) {
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
    const { error: updateError } = await supabaseClient
      .from('qr_cards')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        activated_by: userEmail
      })
      .eq('id', qrCard.id)

    if (updateError) {
      console.error('Error updating QR card:', updateError)
    }

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
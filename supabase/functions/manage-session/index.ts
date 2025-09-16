import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SessionRequest {
  userEmail: string
  sessionToken: string
  deviceInfo?: {
    userAgent?: string
    platform?: string
    timestamp?: string
  }
}

Deno.serve(async (req) => {
  console.log('Session management function called')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: SessionRequest = await req.json()
    console.log('Request data:', { userEmail: requestData.userEmail, hasDeviceInfo: !!requestData.deviceInfo })

    const { userEmail, sessionToken, deviceInfo } = requestData

    if (!userEmail || !sessionToken) {
      console.error('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'userEmail and sessionToken are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check for existing active sessions
    const { data: existingSessions, error: fetchError } = await supabaseClient
      .from('user_sessions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching existing sessions:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing sessions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${existingSessions?.length || 0} existing active sessions for user`)

    // If there are existing active sessions, deactivate them
    if (existingSessions && existingSessions.length > 0) {
      console.log('Deactivating existing sessions')
      const { error: updateError } = await supabaseClient
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_email', userEmail)
        .eq('is_active', true)

      if (updateError) {
        console.error('Error deactivating existing sessions:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to deactivate existing sessions' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Create new session record
    const { data: newSession, error: insertError } = await supabaseClient
      .from('user_sessions')
      .insert({
        user_email: userEmail,
        session_token: sessionToken,
        is_active: true,
        device_info: deviceInfo || null,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating new session:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create new session' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('New session created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: newSession.id,
        previousSessionsDeactivated: existingSessions?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckSessionRequest {
  userEmail: string
  sessionToken: string
}

Deno.serve(async (req) => {
  console.log('Check session function called')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: CheckSessionRequest = await req.json()
    console.log('Checking session for user:', requestData.userEmail)

    const { userEmail, sessionToken } = requestData

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

    // Check if the current session is still active
    const { data: currentSession, error: fetchError } = await supabaseClient
      .from('user_sessions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching current session:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to check session' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!currentSession) {
      console.log('Session not found or inactive')
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          reason: 'Session inactive or not found' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update last_active timestamp
    const { error: updateError } = await supabaseClient
      .from('user_sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('id', currentSession.id)

    if (updateError) {
      console.error('Error updating last_active:', updateError)
    }

    console.log('Session is valid and updated')
    
    return new Response(
      JSON.stringify({ 
        isValid: true, 
        sessionId: currentSession.id,
        lastActive: new Date().toISOString()
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
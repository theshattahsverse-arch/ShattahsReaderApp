import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as z from 'zod'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  userId: z.string().uuid().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validationResult = contactSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, subject, message, userId } = validationResult.data

    const supabase = await createClient()

    // If userId is provided, verify the user exists
    if (userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user || user.id !== userId) {
        return NextResponse.json(
          { error: 'Invalid user authentication' },
          { status: 401 }
        )
      }
    }

    // Insert contact support request
    const { data: contactRequest, error: insertError } = await supabase
      .from('contact_support')
      .insert({
        user_id: userId || null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating contact support request:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit contact form. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Contact form submitted successfully',
        id: contactRequest.id 
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/contact:', error)
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

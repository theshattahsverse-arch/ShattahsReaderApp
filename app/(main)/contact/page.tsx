import { ContactForm } from '@/components/contact/ContactForm'
import { Mail, MessageSquare, Clock, HelpCircle } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50 pt-20 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Contact Support
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're here to help! Reach out to us with any questions, concerns, or feedback.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>

          {/* Info Cards */}
          <div className="space-y-6">
            <div className="rounded-lg border border-border/50 bg-card/50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber/10">
                  <Mail className="h-5 w-5 text-amber" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Send us an email and we'll respond within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber/10">
                  <Clock className="h-5 w-5 text-amber" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Response Time</h3>
                  <p className="text-sm text-muted-foreground">
                    We typically respond within 24-48 hours during business days.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber/10">
                  <HelpCircle className="h-5 w-5 text-amber" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Common Questions</h3>
                  <p className="text-sm text-muted-foreground">
                    Check out our FAQ section for quick answers to common questions.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber/10">
                  <MessageSquare className="h-5 w-5 text-amber" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Need Immediate Help?</h3>
                  <p className="text-sm text-muted-foreground">
                    For urgent matters, please include "URGENT" in your subject line.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

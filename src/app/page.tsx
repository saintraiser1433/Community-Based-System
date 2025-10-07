'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Shield, 
  Calendar, 
  FileText, 
  Phone, 
  Mail, 
  MapPin,
  ChevronDown,
  ChevronUp,
  UserPlus,
  LogIn,
  Home,
  Package,
  BarChart3,
  CheckCircle
} from 'lucide-react'
import Image from 'next/image'

export default function LandingPage() {
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: "What is the MSWDO-GLAN Community Based Donation and Management System?",
      answer: "A transparent platform that connects donors with community members in need, ensuring fair distribution of donations through organized schedules and verified claims for the Municipality of Glan, Sarangani Province."
    },
    {
      question: "How do I register as a resident?",
      answer: "Click the 'Register as Resident' button above, fill out the registration form with your personal information, and add your family members to complete your profile."
    },
    {
      question: "How does the donation claiming process work?",
      answer: "Residents can view available donation schedules for their barangay, claim donations during the specified time slots, and each family can only claim once per donation to ensure fair distribution."
    },
    {
      question: "What if I'm a barangay manager?",
      answer: "Barangay managers can create and manage donation schedules, verify claims from residents, and generate reports on donation distribution within their barangay."
    },
    {
      question: "How do I contact support?",
      answer: "You can reach us through the contact information provided below, or visit our office during business hours for assistance with the system."
    }
  ]

  const features = [
    {
      icon: <Image src="/glanlogos.png" alt="Glan Logo" width={32} height={32} className="h-8 w-8" />,
      title: "Transparent Donations",
      description: "Complete transparency in donation distribution with audit trails and verification systems."
    },
    {
      icon: <Users className="h-8 w-8 text-blue-500" />,
      title: "Family Management",
      description: "Easy family member registration and management for accurate donation tracking."
    },
    {
      icon: <Calendar className="h-8 w-8 text-green-500" />,
      title: "Scheduled Distribution",
      description: "Organized donation schedules to ensure efficient and fair distribution."
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-500" />,
      title: "Secure System",
      description: "Role-based access control and secure authentication for all users."
    }
  ]

  const stats = [
    { label: "Active Residents", value: "1,250+" },
    { label: "Barangays Served", value: "15" },
    { label: "Donations Distributed", value: "3,500+" },
    { label: "Families Helped", value: "2,800+" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Image src="/glanlogos.png" alt="Glan Logo" width={32} height={32} className="h-6 w-6 sm:h-8 sm:w-8" />
              <span className="text-lg sm:text-2xl font-bold text-gray-900">MSWDO-GLAN CBDS</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => router.push('/auth/signin')}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
              <Button 
                onClick={() => router.push('/auth/signup')}
                className="bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Register as Resident</span>
                <span className="sm:hidden">Register</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge className="bg-pink-100 text-pink-800 border-pink-200 mb-4">
              <Image src="/glanlogos.png" alt="Glan Logo" width={12} height={12} className="h-3 w-3 mr-1" />
              Municipality of Glan
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="block">MSWDO-GLAN Community Based</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">
                Donation and Management System
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto px-4">
              A transparent platform that connects donors with community members in need, 
              ensuring fair distribution through organized schedules and verified claims.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 px-4">
            <Button 
              size="lg" 
              onClick={() => router.push('/auth/signup')}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 sm:px-8 py-4 text-base sm:text-lg w-full sm:w-auto"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Register as Resident</span>
              <span className="sm:hidden">Register</span>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => router.push('/auth/signin')}
              className="px-6 sm:px-8 py-4 text-base sm:text-lg w-full sm:w-auto"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Sign In
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 mb-16 px-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-sm sm:text-base text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose Our System?</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Built with transparency, fairness, and community welfare in mind.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Simple steps to ensure fair and transparent donation distribution.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="bg-pink-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Register</h3>
              <p className="text-gray-600">Create your account and add family members to your profile.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. View Schedules</h3>
              <p className="text-gray-600">Check available donation schedules for your barangay.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Claim Donations</h3>
              <p className="text-gray-600">Claim your donation during the scheduled time slot.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Get answers to common questions about our donation system.
            </p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <div className="flex justify-between items-start space-x-4">
                    <CardTitle className="text-base sm:text-lg text-left">{faq.question}</CardTitle>
                    {openFaq === index ? (
                      <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </CardHeader>
                {openFaq === index && (
                  <CardContent>
                    <p className="text-gray-600">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Get in touch with us for support or questions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="text-center">
              <CardHeader>
                <Phone className="h-8 w-8 text-pink-500 mx-auto mb-4" />
                <CardTitle>Phone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">+63 2 1234 5678</p>
                <p className="text-sm text-gray-500">Mon-Fri 8AM-5PM</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <Mail className="h-8 w-8 text-blue-500 mx-auto mb-4" />
                <CardTitle>Email</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">mswdo@glan.gov.ph</p>
                <p className="text-sm text-gray-500">24/7 Support</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <MapPin className="h-8 w-8 text-green-500 mx-auto mb-4" />
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Municipal Social Welfare and Development Office</p>
                <p className="text-sm text-gray-500">Municipality of Glan, Sarangani Province</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-center md:text-left">
              <Image src="/glanlogos.png" alt="Glan Logo" width={24} height={24} className="h-6 w-6 flex-shrink-0" />
              <span className="text-base sm:text-lg md:text-xl font-bold">MSWDO-GLAN Community Based Donation and Management System</span>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm text-center md:text-right">
              © 2024 MSWDO-GLAN CBDS. All rights reserved. Built for the Municipality of Glan, Sarangani Province.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
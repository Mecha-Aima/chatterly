import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Sparkles, Globe, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Logo and Brand */}
          <div className="flex items-center justify-center space-x-3">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Chatterly
            </h1>
          </div>
          
          {/* Main Headline */}
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Master Languages
              <span className="text-primary block">Through Conversation</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Your AI-powered language learning companion that makes fluency feel natural 
              through personalized conversations and real-time feedback.
            </p>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link href="/signup">
              <Button size="lg" className="h-14 px-8 text-lg font-medium shadow-lg">
                Start Learning Free
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-medium">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">Smart Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600">
                Practice with AI tutors that adapt to your learning style and provide 
                instant feedback on pronunciation and grammar.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">Multiple Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600">
                Learn Spanish, French, German, Italian, and more with native-level 
                AI tutors specialized in each language.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">Personalized Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600">
                Your learning path adapts to your progress, interests, and goals for 
                the most effective language acquisition.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        
        {/* Trust Indicators */}
        <div className="mt-24 text-center">
          <p className="text-sm text-gray-500 mb-6">Trusted by language learners worldwide</p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="text-2xl font-bold text-gray-400">🎯 98% Success Rate</div>
            <div className="text-2xl font-bold text-gray-400">⚡ 10M+ Conversations</div>
            <div className="text-2xl font-bold text-gray-400">🌍 50+ Languages</div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Key, Share2, Lock, ChevronRight, ChevronLeft, X } from 'lucide-react';

const steps = [
  {
    icon: Shield,
    title: 'Welcome to VaultKeeper',
    description: 'Your enterprise-grade, zero-knowledge encrypted vault. All your passwords and secrets are encrypted before leaving your device.',
  },
  {
    icon: Key,
    title: 'Create Your First Vault',
    description: 'Organize secrets into vaults. Create a personal vault for your passwords, or team vaults for shared credentials.',
  },
  {
    icon: Share2,
    title: 'Share Securely',
    description: 'Share passwords with team members using end-to-end encryption. Only the recipient can decrypt shared secrets.',
  },
  {
    icon: Lock,
    title: 'Stay Secure',
    description: 'Enable MFA for extra protection. Use the Security Checkpost to monitor password health and find vulnerabilities.',
  },
];

interface OnboardingCarouselProps {
  onDismiss: () => void;
}

export function OnboardingCarousel({ onDismiss }: OnboardingCarouselProps) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  const Icon = step.icon;

  return (
    <Card className="relative overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="p-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{step.description}</p>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            disabled={current === 0}
            onClick={() => setCurrent(current - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
          {current < steps.length - 1 ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent(current + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={onDismiss}>
              Get Started
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

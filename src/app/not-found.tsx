import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Coffee } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex items-center gap-4">
        <Coffee className="h-16 w-16 text-primary" />
        <div>
          <h1 className="font-headline text-5xl font-bold text-primary">404</h1>
          <p className="text-lg text-muted-foreground">Page Not Found</p>
        </div>
      </div>
      <p className="max-w-md text-muted-foreground">
        It seems you've wandered off the menu. The page you're looking for doesn't exist.
      </p>
      <Button asChild>
        <Link href="/">Return to Homepage</Link>
      </Button>
    </main>
  )
}

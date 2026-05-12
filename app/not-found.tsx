import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-mga-cream flex items-center justify-center px-4">
      <div className="mga-card max-w-md w-full p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-mga-green-pale flex items-center justify-center">
            <Compass className="h-7 w-7 text-mga-green-dark" aria-hidden="true" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Page not found</h2>
          <p className="text-sm text-gray-600 mt-1">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex w-full justify-center items-center rounded-xl bg-mga-green-mid text-white py-3 px-4 font-semibold hover:bg-mga-green-dark transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

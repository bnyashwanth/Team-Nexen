'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img 
        src="/assets/logo.svg" 
        alt="Nexen Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  )
}

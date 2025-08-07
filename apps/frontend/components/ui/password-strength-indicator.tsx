"use client"

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Lock, X } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  password: string
  showRequirements?: boolean
  className?: string
}

interface PasswordRequirement {
  text: string
  met: boolean
  critical: boolean
}

export function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true, 
  className = "" 
}: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = useState(0)
  const [strengthLabel, setStrengthLabel] = useState('')
  const [strengthColor, setStrengthColor] = useState('')
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([])

  useEffect(() => {
    const calculateStrength = () => {
      let score = 0
      const reqs: PasswordRequirement[] = [
        { text: 'At least 8 characters', met: password.length >= 8, critical: true },
        { text: 'Contains uppercase letter', met: /[A-Z]/.test(password), critical: true },
        { text: 'Contains lowercase letter', met: /[a-z]/.test(password), critical: true },
        { text: 'Contains number', met: /\d/.test(password), critical: true },
        { text: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password), critical: false },
      ]

      // Calculate score based on met requirements
      reqs.forEach(req => {
        if (req.met) {
          score += req.critical ? 20 : 10
        }
      })

      // Bonus for length
      if (password.length >= 12) score += 10
      if (password.length >= 16) score += 10

      // Penalize for common patterns
      if (/(.)\1{2,}/.test(password)) score -= 10
      if (/password|123456|qwerty/i.test(password)) score -= 20

      score = Math.max(0, Math.min(100, score))

      // Determine strength label and color
      let label = ''
      let color = ''
      
      if (score === 0) {
        label = 'Very Weak'
        color = 'bg-red-500'
      } else if (score < 40) {
        label = 'Weak'
        color = 'bg-red-500'
      } else if (score < 60) {
        label = 'Fair'
        color = 'bg-yellow-500'
      } else if (score < 80) {
        label = 'Good'
        color = 'bg-blue-500'
      } else {
        label = 'Strong'
        color = 'bg-green-500'
      }

      setStrength(score)
      setStrengthLabel(label)
      setStrengthColor(color)
      setRequirements(reqs)
    }

    calculateStrength()
  }, [password])

  const getStrengthIcon = () => {
    if (strength < 40) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (strength < 60) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    if (strength < 80) return <Check className="h-4 w-4 text-blue-500" />
    return <Check className="h-4 w-4 text-green-500" />
  }

  const unmetCriticalRequirements = requirements.filter(req => !req.met && req.critical)

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Password Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password Strength
          </span>
          <div className="flex items-center gap-2">
            {getStrengthIcon()}
            <span className={`text-sm font-medium ${
              strength < 40 ? 'text-red-600' :
              strength < 60 ? 'text-yellow-600' :
              strength < 80 ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {strengthLabel}
            </span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${strengthColor}`}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Password Requirements */}
      {showRequirements && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Requirements:</p>
          <div className="grid grid-cols-1 gap-1">
            {requirements.map((req, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-2 text-sm p-2 rounded ${
                  req.met ? 'text-green-700 bg-green-50' : 
                  req.critical ? 'text-red-700 bg-red-50' : 
                  'text-gray-600 bg-gray-50'
                }`}
              >
                {req.met ? (
                  <Check className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <X className="h-3 w-3 flex-shrink-0" />
                )}
                <span>{req.text}</span>
                {req.critical && !req.met && (
                  <span className="text-xs text-red-600">(Required)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Password Tips */}
      {password && strength < 60 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Tips for a stronger password:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Use a mix of uppercase and lowercase letters</li>
                <li>Include numbers and special characters</li>
                <li>Make it at least 12 characters long</li>
                <li>Avoid common words or patterns</li>
                <li>Consider using a passphrase</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warning for weak passwords */}
      {password && unmetCriticalRequirements.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">
                {unmetCriticalRequirements.length} required {unmetCriticalRequirements.length === 1 ? 'requirement' : 'requirements'} not met
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for password validation
export function usePasswordValidation(password: string, confirmPassword: string) {
  const [isValid, setIsValid] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const validationErrors: string[] = []
    
    if (password.length < 8) {
      validationErrors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      validationErrors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      validationErrors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      validationErrors.push('Password must contain at least one number')
    }
    
    if (confirmPassword && password !== confirmPassword) {
      validationErrors.push('Passwords do not match')
    }

    setErrors(validationErrors)
    setIsValid(validationErrors.length === 0 && password.length >= 8)
  }, [password, confirmPassword])

  return {
    isValid,
    errors,
    hasErrors: errors.length > 0
  }
}
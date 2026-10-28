import { useState, useRef } from 'react'
import './LoginPage.css'

export default function LoginPage({ onLogin }) {
  const [step, setStep] = useState(1) // 1 = credentials, 2 = 2FA
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  function handleContinue(e) {
    e.preventDefault()
    if (email && password) setStep(2)
  }

  function handleDigit(idx, val) {
    if (!/^\d?$/.test(val)) return
    const next = [...code]
    next[idx] = val
    setCode(next)
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus()
    if (next.every(d => d !== '') && next.join('').length === 6) {
      // auto-verify after a tick
      setTimeout(onLogin, 300)
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <span className="logo-icon">+</span>
          <span className="logo-text">ProHealth</span>
        </div>

        <h1 className="login-title">Staff sign in</h1>
        <p className="login-sub">Administrators and pharmacists only</p>

        <form onSubmit={handleContinue}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@prohealth.co.ke"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary login-btn" type="submit">
            Continue
          </button>
        </form>

        {step === 2 && (
          <div className="tfa-section">
            <div className="tfa-divider" />
            <h2 className="tfa-title">Step 2: two-factor authentication</h2>
            <p className="tfa-sub">Enter the 6-digit code from your authenticator app</p>
            <div className="tfa-inputs">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => (inputRefs.current[i] = el)}
                  className={'tfa-input' + (digit ? ' tfa-input--filled' : '')}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                />
              ))}
            </div>
            <button className="tfa-verify btn btn-primary" onClick={onLogin}>
              Verify &amp; Sign in
            </button>
          </div>
        )}

        <div className="login-footer">
          <a href="#forgot" className="forgot-link">Forgot password?</a>
        </div>
      </div>
    </div>
  )
}


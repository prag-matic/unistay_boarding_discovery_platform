export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    label: string;
    met: boolean;
  }[];
}

export function getPasswordStrength(password: string): PasswordStrength {
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One number (0-9)', met: /[0-9]/.test(password) },
    { label: 'One special character (!@#$)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  const clampedScore = Math.min(4, Math.floor((score / 5) * 4));

  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#EF4444', '#EF4444', '#4A7BF7', '#4A7BF7', '#22C55E'];

  return {
    score: clampedScore,
    label: labels[clampedScore],
    color: colors[clampedScore],
    requirements,
  };
}

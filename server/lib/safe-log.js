/** Redacts credentials before an error message is written to application logs. */
export function safeErrorMessage(error) {
  const message = String(error?.message || error || 'Unknown error');
  return message
    .replace(/(mongodb(?:\+srv)?:\/\/)([^@\s/]+)@/gi, '$1<credentials>@')
    .replace(/(password|secret|token|key)=([^&\s]+)/gi, '$1=<redacted>')
    .replace(/(JWT_SECRET[=:]\s*)([^\s]+)/gi, '$1<redacted>');
}

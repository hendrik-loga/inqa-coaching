export function generateVCard(contact) {
  const esc = str => (str || '').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ')

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${esc(fullName)}`,
    `N:${esc(contact.lastName)};${esc(contact.firstName)};;;`,
  ]

  if (contact.company)    lines.push(`ORG:${esc(contact.company)}`)
  if (contact.jobTitle)   lines.push(`TITLE:${esc(contact.jobTitle)}`)
  if (contact.phone)      lines.push(`TEL;TYPE=WORK,VOICE:${contact.phone}`)
  if (contact.mobile)     lines.push(`TEL;TYPE=CELL,VOICE:${contact.mobile}`)
  if (contact.email)      lines.push(`EMAIL;TYPE=WORK:${contact.email}`)
  if (contact.website)    lines.push(`URL;TYPE=WORK:${contact.website}`)

  if (contact.street || contact.city) {
    lines.push(`ADR;TYPE=WORK:;;${esc(contact.street)};${esc(contact.city)};;${esc(contact.postalCode)};${esc(contact.country || 'Deutschland')}`)
  }

  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export async function shareOrDownloadVCard(contact) {
  const vcf = generateVCard(contact)
  const fileName = `${contact.lastName || contact.firstName || 'kontakt'}.vcf`
  const file = new File([vcf], fileName, { type: 'text/vcard' })

  // Web Share API (iOS 15+ Safari) – shows native share sheet incl. "Zu Kontakten"
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: [contact.firstName, contact.lastName].filter(Boolean).join(' ') })
    return 'shared'
  }

  // Fallback: navigate to blob URL – iOS opens .vcf natively in Contacts
  const blob = new Blob([vcf], { type: 'text/vcard' })
  const url = URL.createObjectURL(blob)
  window.location.href = url
  return 'downloaded'
}

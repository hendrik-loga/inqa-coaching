export function parseBusinessCard(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const contact = {
    firstName: '', lastName: '', jobTitle: '', company: '',
    email: '', phone: '', mobile: '', website: '',
    street: '', city: '', postalCode: '', country: ''
  }
  const used = new Set()

  // Email
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
    if (m) { contact.email = m[0]; used.add(i); break }
  }

  // Phone numbers
  const phones = []
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue
    const ms = [...lines[i].matchAll(/(?:\+\d{1,3}[\s\-/]?)?(?:\(0\d{1,4}\)|\d{1,5})[\s\-/\.]?\d{2,5}(?:[\s\-/\.]\d{1,5})*/g)]
    const valid = ms.map(m => m[0].trim()).filter(p => p.replace(/\D/g, '').length >= 6)
    if (valid.length) { phones.push(...valid); used.add(i) }
  }
  if (phones[0]) contact.phone = phones[0]
  if (phones[1]) contact.mobile = phones[1]

  // Website
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue
    const m = lines[i].match(/(?:https?:\/\/)?(?:www\.)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/)
    if (m) {
      contact.website = m[0].startsWith('http') ? m[0] : 'https://' + m[0]
      used.add(i); break
    }
  }

  // Company
  const companyWords = ['GmbH', 'AG', ' KG', 'OHG', ' SE', 'e.V.', 'Ltd', 'LLC',
    'Inc.', 'GbR', 'UG ', 'Gruppe', 'Group', 'Consulting', 'Solutions', 'Services', 'Systems']
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue
    if (companyWords.some(w => lines[i].toLowerCase().includes(w.toLowerCase()))) {
      contact.company = lines[i]; used.add(i); break
    }
  }

  // Postal code + city
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue
    const m = lines[i].match(/(?<!\d)(\d{5})(?!\d)/)
    if (m) {
      contact.postalCode = m[1]
      contact.city = lines[i].replace(m[1], '').trim().replace(/^[,\s]+/, '')
      used.add(i)
      if (i > 0 && !used.has(i - 1) &&
          /str\.|straße|strasse|gasse|weg|allee|platz|ring/i.test(lines[i - 1])) {
        contact.street = lines[i - 1]; used.add(i - 1)
      }
      break
    }
  }

  // Job title
  const titleWords = ['Manager', 'Direktor', 'Director', 'CEO', 'CFO', 'CTO', 'COO',
    'Geschäftsführer', 'Leiter', 'Head of', 'Senior', 'Junior', 'Berater', 'Consultant',
    'Entwickler', 'Ingenieur', 'Engineer', 'Coach', 'Trainer', 'Analyst', 'Designer',
    'Assistent', 'Koordinator', 'Projektmanager', 'Vertrieb', 'Sales']
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue
    if (titleWords.some(w => lines[i].toLowerCase().includes(w.toLowerCase()))) {
      contact.jobTitle = lines[i]; used.add(i); break
    }
  }

  // Name from remaining lines
  const remaining = lines.filter((_, i) => !used.has(i))
  let nameFound = false
  for (const line of remaining) {
    const words = line.split(' ').filter(Boolean)
    if (words.length >= 2 && words.length <= 5 && !/\d/.test(line)) {
      const allCap = words.every(w =>
        /^[A-ZÄÖÜ]/.test(w) || ['von', 'van', 'de', 'der', 'den'].includes(w.toLowerCase())
      )
      if (allCap) {
        contact.firstName = words.slice(0, -1).join(' ')
        contact.lastName = words[words.length - 1]
        nameFound = true; break
      }
    }
  }
  if (!nameFound && remaining[0]) {
    const words = remaining[0].split(' ').filter(Boolean)
    contact.firstName = words.slice(0, -1).join(' ')
    contact.lastName = words[words.length - 1] || remaining[0]
  }

  return contact
}

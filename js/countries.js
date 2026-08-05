export const COUNTRY_DIAL_CODES = [
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "Kenya", code: "+254", flag: "🇰🇪" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Ghana", code: "+233", flag: "🇬🇭" },
  { name: "Uganda", code: "+256", flag: "🇺🇬" },
  { name: "Tanzania", code: "+255", flag: "🇹🇿" },
  { name: "UAE", code: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Colombia", code: "+57", flag: "🇨🇴" }
];

/**
 * Detect the user's likely country from their browser timezone.
 * Returns the matching dial code entry from COUNTRY_DIAL_CODES, or null.
 */
export function detectUserCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (!tz) return null;

    // Map common timezone regions to country names
    const tzToCountry = {
      'America/New_York': 'United States',
      'America/Chicago': 'United States',
      'America/Denver': 'United States',
      'America/Los_Angeles': 'United States',
      'America/Phoenix': 'United States',
      'America/Anchorage': 'United States',
      'America/Honolulu': 'United States',
      'America/Toronto': 'Canada',
      'America/Vancouver': 'Canada',
      'America/Montreal': 'Canada',
      'America/Mexico_City': 'Mexico',
      'America/Bogota': 'Colombia',
      'America/Argentina/Buenos_Aires': 'Argentina',
      'America/Sao_Paulo': 'Brazil',
      'Europe/London': 'United Kingdom',
      'Europe/Paris': 'France',
      'Europe/Berlin': 'Germany',
      'Europe/Madrid': 'Spain',
      'Europe/Rome': 'Italy',
      'Europe/Istanbul': 'Turkey',
      'Africa/Nairobi': 'Kenya',
      'Africa/Lagos': 'Nigeria',
      'Africa/Johannesburg': 'South Africa',
      'Africa/Accra': 'Ghana',
      'Africa/Kampala': 'Uganda',
      'Africa/Dar_es_Salaam': 'Tanzania',
      'Africa/Cairo': 'Egypt',
      'Asia/Kolkata': 'India',
      'Asia/Dubai': 'UAE',
      'Asia/Riyadh': 'Saudi Arabia',
      'Asia/Shanghai': 'China',
      'Asia/Tokyo': 'Japan',
      'Asia/Seoul': 'South Korea',
      'Asia/Singapore': 'Singapore',
      'Asia/Kuala_Lumpur': 'Malaysia',
      'Asia/Jakarta': 'Indonesia',
      'Asia/Manila': 'Philippines',
      'Asia/Ho_Chi_Minh': 'Vietnam',
      'Asia/Bangkok': 'Vietnam',
      'Asia/Karachi': 'Pakistan',
      'Asia/Dhaka': 'Bangladesh',
      'Australia/Sydney': 'Australia',
      'Australia/Melbourne': 'Australia',
      'Australia/Perth': 'Australia',
      'Pacific/Auckland': 'Australia',
    };

    const countryName = tzToCountry[tz];
    if (!countryName) return null;

    // Find the matching dial code entry
    return COUNTRY_DIAL_CODES.find(c => c.name === countryName) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Get the default country code for the phone select.
 * Uses detected country if available, otherwise falls back to +1 US.
 */
export function getDefaultCountryCode() {
  const detected = detectUserCountry();
  return detected ? detected.code : '+1';
}

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua & Barbuda", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia & Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Brazzaville)",
  "Congo (Kinshasa)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
  "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Samoa",
  "San Marino", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad & Tobago",
  "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export default COUNTRIES;

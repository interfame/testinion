// GrowthRush — Legal documents (Terms of Service, Privacy Policy, Liability &
// Trademark Disclaimer). English is the canonical version; Spanish is provided
// as a courtesy translation. Rendered by src/components/shared/legal-pages.tsx.

export type LegalSection = { h: string; ps?: string[]; bullets?: string[] }
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] }
export type LegalLang = 'en' | 'es'
export type LegalKey = 'terms' | 'privacy' | 'responsibility'

const CONTACT_EN = 'Questions about this document? Contact us at legal@growthrush.io.'
const CONTACT_ES = '¿Preguntas sobre este documento? Escríbenos a legal@growthrush.io.'

/* ─────────────────────────── ENGLISH ─────────────────────────── */

const terms: LegalDoc = {
  title: 'Terms of Service',
  updated: 'February 2025',
  intro:
    'These Terms of Service ("Terms") govern your access to and use of the GrowthRush platform, websites, storefronts, panels and related services (collectively, the "Service"). By creating an account, purchasing a plan, depositing funds or placing an order, you agree to be bound by these Terms. If you do not agree, do not use the Service.',
  sections: [
    {
      h: '1. Who we are',
      ps: [
        'GrowthRush is a software-as-a-service (SaaS) platform that provides tools for social-media-marketing (SMM) order management, customer relationship management (CRM), and white-label reseller websites. Depending on context, "GrowthRush", "we", "us" or "our" refers to the master platform operated by its owner, and to independent reseller platforms powered by our software.',
        'Some storefronts you may visit are operated by independent resellers under their own brand. Those resellers are solely responsible for their own content, prices, clients and promotions. Unless a page explicitly states otherwise, a storefront with a custom brand is not operated by the GrowthRush master platform.',
      ],
    },
    {
      h: '2. Eligibility & accounts',
      bullets: [
        'You must be at least 18 years old (or the age of legal majority in your jurisdiction) to use the Service.',
        'You are responsible for the accuracy of your registration data and for keeping your password and API key confidential. Activity performed with your credentials is deemed your activity.',
        'One person or legal entity may operate one platform per account unless expressly authorized in writing.',
        'We may suspend or terminate accounts that breach these Terms, attempt fraud or chargeback abuse, or put the Service or third parties at risk.',
      ],
    },
    {
      h: '3. Nature of the services',
      ps: [
        'The Service is a technical management platform. Orders you place (followers, views, likes, subscribers, comments, traffic and similar engagements) are processed through automated pipelines and, where enabled, third-party provider APIs.',
        'We do not control third-party social networks and cannot guarantee the permanent behavior of content or metrics on those networks. Delivery estimates are good-faith approximations, not guarantees. Counters visible on third-party platforms may fluctuate, lag, or be adjusted by those platforms without notice.',
      ],
    },
    {
      h: '4. Reseller plans, rentals & renewals',
      bullets: [
        'Platform plans are rentals billed in advance on a monthly or annual cycle, plus any optional add-ons (custom domain, external API connector, etc.) shown at checkout.',
        'Setup fees, domain fees and add-on fees, when charged, cover provisioning and are non-refundable once the platform is created.',
        'Annual plans renew for successive 12-month terms unless canceled before the renewal date; monthly plans renew monthly. You can cancel at any time from your panel; access remains active until the end of the paid period.',
        'We may change plan prices with at least 30 days\' notice before the next renewal; the change never applies retroactively to the current paid term.',
        'If a renewal payment fails, the platform may be suspended and, after a grace period of 14 days, archived together with its data.',
      ],
    },
    {
      h: '5. Payments, wallet & taxes',
      bullets: [
        'Deposits are credited to your in-platform wallet and spent on orders or plan fees. Wallet balances are prepaid credits for use within the Service; they are not bank deposits and do not accrue interest.',
        'You must use payment methods you are lawfully entitled to use. Payment processors may require identity verification (KYC) for some transactions.',
        'Prices are shown in your selected currency for convenience; charges are processed in the currency of the checkout method and may be subject to conversion fees imposed by your bank or processor.',
        'You are responsible for any taxes, duties or bank fees applicable to your purchases. Where required by law, applicable taxes will be added and shown at checkout.',
        'Unauthorized chargebacks or disputes filed without first contacting support may result in immediate suspension of the account and platform.',
      ],
    },
    {
      h: '6. Refund policy',
      bullets: [
        'Completed and in-progress orders are generally non-refundable because processing starts immediately.',
        'If an order cannot be delivered at all, we refund the undelivered proportion to your wallet, automatically or upon ticket review.',
        'Wallet deposits are refundable within 24 hours of the deposit only if unused, on request to support; plan, setup, domain and add-on fees are non-refundable once provisioned.',
        'Refunds, when authorized, are returned via the original payment method or as wallet credit, at our discretion.',
      ],
    },
    {
      h: '7. Acceptable use',
      ps: [
        'You agree NOT to use the Service to:',
      ],
      bullets: [
        'promote violence, hatred, harassment, self-harm, exploitation of minors, or any illegal content or activity;',
        'infringe intellectual property, publicity or privacy rights of third parties, including using trademarks or likenesses in ways that suggest false endorsements;',
        'spread malware, phishing, spam, scams, or artificially manipulate platform metrics on any network in breach of that network\'s terms;',
        'sell, resell or provide the Service to persons or jurisdictions subject to applicable sanctions;',
        'attack, probe, reverse-engineer or disrupt the Service, other platforms, or their users.',
      ],
    },
    {
      h: '8. Reseller responsibilities',
      bullets: [
        'Resellers operate their own businesses: they set their prices, configure their payment gateways, manage their clients, and are solely responsible for their storefront content and customer support.',
        'Resellers must hold all rights required for the brands, logos and domains they use, and must publish their own legal notices where local law requires it.',
        'Resellers are the data controllers for the personal data of their own clients; GrowthRush acts as a processor for that data.',
      ],
    },
    {
      h: '9. Third-party platforms & trademarks',
      ps: [
        'Instagram, TikTok, YouTube, Facebook, X/Twitter, Telegram, Spotify, Twitch, WhatsApp and all other platform names and logos mentioned in the Service are trademarks or registered trademarks of their respective owners.',
        'GrowthRush is an independent service. It is not affiliated with, endorsed by, sponsored by, or associated with any of those platforms. Brand names, logos and icons are referenced for descriptive purposes only (nominative fair use) to identify which network a given service relates to.',
        'All product names, logos, brands and images remain the property of their respective owners. Right holders who believe their rights are infringed may contact legal@growthrush.io for prompt review and removal where appropriate.',
      ],
    },
    {
      h: '10. Warranties & disclaimer',
      ps: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY ENGAGEMENT METRIC WILL BE MAINTAINED BY ANY THIRD-PARTY PLATFORM.',
      ],
    },
    {
      h: '11. Limitation of liability',
      ps: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR AGGREGATE LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICE IS LIMITED TO THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, LOST PROFITS, REVENUE, DATA OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY.',
      ],
    },
    {
      h: '12. Indemnification',
      ps: [
        'You agree to indemnify and hold harmless GrowthRush, its operators, affiliates and staff from any claim, demand, loss or expense (including reasonable legal fees) arising from your content, your links, your use of the Service, your reseller activity, or your breach of these Terms or of any third-party platform\'s terms.',
      ],
    },
    {
      h: '13. Termination & changes',
      bullets: [
        'You may stop using the Service and close your account at any time; active paid platform terms continue until the end of the paid period.',
        'We may modify these Terms; material changes will be announced on the platform or by email at least 14 days before taking effect. Continued use after the effective date constitutes acceptance.',
        'These Terms are governed by the laws of the operator\'s place of establishment, without regard to conflict-of-laws rules. Mandatory consumer protections of your country of residence, where applicable, prevail.',
      ],
    },
    {
      h: '14. Contact',
      ps: [CONTACT_EN],
    },
  ],
}

const privacy: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'February 2025',
  intro:
    'This Privacy Policy explains how GrowthRush collects, uses, discloses and protects personal data when you use our platform, storefronts and panels, and describes the rights you have over that data.',
  sections: [
    {
      h: '1. Data we collect',
      bullets: [
        'Account data: name, email, password (stored only as a salted hash), preferred currency and language, timezone.',
        'Commercial data: orders, deposits, transactions, invoices, plan subscriptions, promo-code redemptions, support tickets.',
        'Reseller platform data: platform name, domain/subdomain, branding, landing content, payment-gateway configuration (credentials are stored encrypted and only ever displayed masked).',
        'Technical data: IP address, session cookie, device/browser type, and minimal security logs used to prevent fraud and abuse.',
        'Optional data: card tokens or last-4 digits saved by you for faster checkout; we never store full card numbers (CVV is never stored at all).',
      ],
    },
    {
      h: '2. How we use data',
      bullets: [
        'To operate the Service: process orders, credit wallets, renew platform rentals, provide support and prevent abuse.',
        'To communicate transactional information (order updates, deposit status, security notices) and, where you opt in, product updates.',
        'To comply with legal obligations (tax, accounting, sanctions screening) and enforce our Terms.',
        'We do not sell your personal data, and we do not use your data for third-party advertising profiling.',
      ],
    },
    {
      h: '3. Cookies & local storage',
      ps: [
        'We use a strictly-necessary, signed, httpOnly session cookie to keep you logged in, and local storage to remember preferences such as language and dismissed banners. Optional analytics cookies, if ever enabled, will be disclosed here and subject to your consent.',
      ],
    },
    {
      h: '4. Payment processors & third parties',
      bullets: [
        'Payments are processed by independent gateways (e.g. PayPal, MercadoPago, Pix participating banks, Cryptomus, CoinPayments, Payoneer, card acquirers). When you pay, the processor receives the data needed to complete the transaction under its own privacy policy.',
        'On reseller storefronts, the reseller\'s configured gateway accounts receive the payment; the reseller is responsible for that processing.',
        'We use hosting, database and email-delivery providers that process data on our instructions under data-processing agreements.',
        'We may disclose data to competent authorities where required by law, or to protect rights, property and safety.',
      ],
    },
    {
      h: '5. Retention',
      ps: [
        'Account and transaction records are kept while your account is active and for the period required by tax and commercial law (typically up to 10 years for billing records). Support tickets are kept for 24 months. Security logs are kept for 12 months. Data is deleted or irreversibly anonymized afterwards.',
      ],
    },
    {
      h: '6. Security',
      bullets: [
        'Passwords are hashed (never stored in clear text), sessions use signed httpOnly cookies, and payment-gateway credentials are encrypted at rest and only ever shown masked to their owner.',
        'Access to production data is restricted to authorized personnel and rate-limited APIs protect against brute-force attacks. No system is 100% secure; please use unique passwords and enable 2FA where available.',
      ],
    },
    {
      h: '7. Your rights',
      bullets: [
        'Access, rectification, erasure, restriction, portability and objection, and withdrawal of consent where processing is consent-based (e.g. marketing).',
        'Residents of the EEA/UK exercise GDPR rights and residents of several US states exercise CCPA/CPRA rights by writing to privacy@growthrush.io; we respond within 30 days.',
        'You may also lodge a complaint with your local data-protection authority.',
        'If you registered on a reseller storefront, address rights requests to the reseller first; we will support them as processor.',
      ],
    },
    {
      h: '8. Children',
      ps: [
        'The Service is not directed to children under 18. We do not knowingly collect data from minors; if we learn we have, we delete it promptly.',
      ],
    },
    {
      h: '9. International transfers',
      ps: [
        'Your data may be processed in countries other than yours. Where required, transfers rely on adequacy decisions or standard contractual clauses with equivalent safeguards.',
      ],
    },
    {
      h: '10. Changes & contact',
      ps: [
        'We will announce material changes to this policy on the platform before they take effect.',
        CONTACT_EN,
      ],
    },
  ],
}

const responsibility: LegalDoc = {
  title: 'Liability & Trademark Disclaimer',
  updated: 'February 2025',
  intro:
    'This page limits the responsibility of the GrowthRush platform and its operators and clarifies the use of third-party names, logos and brands across the Service. It complements — and does not replace — the Terms of Service and the Privacy Policy.',
  sections: [
    {
      h: '1. No affiliation or endorsement',
      ps: [
        'GrowthRush is an independent SaaS tool. We are NOT affiliated with, associated with, authorized by, endorsed by, or in any way officially connected with Instagram, TikTok, YouTube, Facebook, X, Telegram, WhatsApp, Spotify, Twitch, Kick, LinkedIn, Reddit, Pinterest, Snapchat, Threads, or any other social network, streaming platform, payment processor or brand referenced anywhere in the Service.',
        'All trademarks, logos, brand names, screenshots and product names displayed are the property of their respective owners and are used exclusively for descriptive, referential purposes: to identify the network a service relates to or the compatibility of an integration. Such referential use does not imply sponsorship or endorsement by any brand.',
      ],
    },
    {
      h: '2. As-is delivery of engagement services',
      ps: [
        'Engagement metrics (followers, likes, views, etc.) exist on third-party systems that we do not control. Their owners may change algorithms, purge accounts or adjust counters at any time and without notice. Consequently, results delivered through the Service are provided "as is" and "as available", and we make no guarantee that metrics will be preserved, visible or permanent on any third-party platform.',
        'Where a service includes a refill or guarantee window, our only obligation is to re-run the affected order within that window; we are not liable for losses derived from third-party platform actions.',
      ],
    },
    {
      h: '3. User responsibility',
      ps: [
        'You are solely responsible for the links you submit, the accounts you administer, the content you promote and your compliance with each third-party platform\'s terms of service, community rules and applicable laws. Before placing an order, make sure your activity does not violate those terms.',
        'Resellers are additionally responsible for their own clients, prices, promotions, published content and local legal compliance (consumer law, taxes, invoicing, and their own legal notices).',
      ],
    },
    {
      h: '4. Limitation of liability',
      ps: [
        'To the maximum extent permitted by law, the operators of GrowthRush shall not be liable for any indirect, incidental, special or consequential damages, including loss of accounts, followers, revenue, data, reputation or business opportunities, arising from the use of, or inability to use, the Service or from actions taken by third-party platforms.',
        'Aggregate liability, if any, is limited to the amounts actually paid to us by the claiming user in the twelve months preceding the event (as further detailed in the Terms of Service).',
      ],
    },
    {
      h: '5. Indemnity',
      ps: [
        'You agree to defend and indemnify the GrowthRush operators, staff and affiliates against any third-party claim (including claims by social networks or brand owners) arising from your use of the Service, your content, your links or your reseller activity.',
      ],
    },
    {
      h: '6. Trademark complaints',
      ps: [
        'If you are a rights holder and believe any content available through the Service infringes your trademark, copyright or other rights, contact legal@growthrush.io with identification of the right, the material at issue and a good-faith statement. Verified complaints are reviewed promptly and material is removed or corrected where appropriate.',
      ],
    },
    {
      h: '7. Contact',
      ps: [CONTACT_EN],
    },
  ],
}

const LEGAL_EN: Record<LegalKey, LegalDoc> = { terms, privacy, responsibility }

/* ─────────────────────────── ESPAÑOL ─────────────────────────── */

const termsEs: LegalDoc = {
  title: 'Términos y Condiciones',
  updated: 'Febrero 2025',
  intro:
    'Estos Términos y Condiciones ("Términos") regulan tu acceso y uso de la plataforma GrowthRush, sus sitios, storefronts, paneles y servicios relacionados (en conjunto, el "Servicio"). Al crear una cuenta, contratar un plan, depositar fondos o realizar un pedido, aceptas estos Términos. Si no estás de acuerdo, no utilices el Servicio.',
  sections: [
    {
      h: '1. Quiénes somos',
      ps: [
        'GrowthRush es una plataforma SaaS que provee herramientas para la gestión de pedidos de marketing en redes sociales (SMM), CRM omnicanal y sitios white-label para revendedores. Según el contexto, "GrowthRush", "nosotros" o "nuestro" refiere a la plataforma master operada por su titular, y a las plataformas de revendedores independientes que funcionan con nuestro software.',
        'Algunos storefronts que puedes visitar son operados por revendedores independientes bajo su propia marca. Esos revendedores son los únicos responsables de su contenido, precios, clientes y promociones. Salvo que se indique lo contrario, un storefront con marca propia no es operado por la plataforma master GrowthRush.',
      ],
    },
    {
      h: '2. Elegibilidad y cuentas',
      bullets: [
        'Debes tener al menos 18 años (o la mayoría de edad legal en tu jurisdicción) para usar el Servicio.',
        'Eres responsable de la exactitud de tus datos de registro y de la confidencialidad de tu contraseña y tu clave API. La actividad realizada con tus credenciales se considera tuya.',
        'Cada persona o entidad puede operar una plataforma por cuenta, salvo autorización expresa por escrito.',
        'Podemos suspender o cerrar cuentas que incumplan estos Términos, intenten fraude o abuso de contracargos, o pongan en riesgo al Servicio o a terceros.',
      ],
    },
    {
      h: '3. Naturaleza de los servicios',
      ps: [
        'El Servicio es una plataforma técnica de gestión. Los pedidos que realizas (seguidores, vistas, likes, suscriptores, comentarios, tráfico y métricas similares) se procesan mediante pipelines automatizados y, cuando está habilitado, APIs de proveedores externos.',
        'No controlamos las redes sociales de terceros ni podemos garantizar el comportamiento permanente del contenido o las métricas en esas redes. Los tiempos de entrega son estimaciones de buena fe, no garantías. Los contadores visibles en plataformas de terceros pueden fluctuar, demorarse o ser ajustados por esas plataformas sin aviso.',
      ],
    },
    {
      h: '4. Planes de revendedor, alquiler y renovaciones',
      bullets: [
        'Los planes de plataforma son alquileres facturados por adelantado en ciclo mensual o anual, más los add-ons opcionales (dominio propio, conector API externo, etc.) mostrados al momento de la compra.',
        'Los cargos de setup, dominio y add-ons, cuando correspondan, cubren el aprovisionamiento y no son reembolsables una vez creada la plataforma.',
        'Los planes anuales se renuevan por términos sucesivos de 12 meses salvo cancelación antes de la fecha de renovación; los mensuales se renuevan mes a mes. Puedes cancelar cuando quieras desde tu panel; el acceso permanece activo hasta el fin del período pagado.',
        'Podemos cambiar los precios con al menos 30 días de aviso previo a la próxima renovación; el cambio nunca se aplica retroactivamente al término en curso.',
        'Si una renovación falla, la plataforma puede suspenderse y, tras un período de gracia de 14 días, archivarse junto con sus datos.',
      ],
    },
    {
      h: '5. Pagos, billetera e impuestos',
      bullets: [
        'Los depósitos se acreditan en la billetera interna y se consumen con pedidos o cuotas de planes. El saldo es un crédito prepagado para uso dentro del Servicio; no es un depósito bancario ni genera intereses.',
        'Debes usar métodos de pago que te pertenezcan legítimamente. Los procesadores pueden exigir verificación de identidad (KYC) en algunas transacciones.',
        'Los precios se muestran en tu moneda elegida a modo de conveniencia; el cobro se procesa en la moneda del método de pago y puede estar sujeto a comisiones de cambio de tu banco o procesador.',
        'Eres responsable de los impuestos, tasas o cargos bancarios aplicables a tus compras. Cuando la ley lo exija, los impuestos correspondientes se sumarán y mostrarán en el checkout.',
        'Contracargos o disputas no autorizadas iniciados sin contactar antes a soporte pueden provocar la suspensión inmediata de la cuenta y la plataforma.',
      ],
    },
    {
      h: '6. Política de reembolsos',
      bullets: [
        'Los pedidos completados y en progreso generalmente no son reembolsables porque el procesamiento comienza de inmediato.',
        'Si un pedido no puede entregarse en absoluto, reembolsamos la proporción no entregada a tu billetera, en forma automática o tras revisar el ticket.',
        'Los depósitos a la billetera son reembolsables dentro de las 24 horas solo si no fueron utilizados, solicitándolo a soporte; las cuotas de plan, setup, dominio y add-ons no son reembolsables una vez aprovisionados.',
        'Los reembolsos autorizados se devuelven por el medio original o como crédito en la billetera, a nuestro criterio.',
      ],
    },
    {
      h: '7. Uso aceptable',
      ps: ['Te comprometes a NO usar el Servicio para:'],
      bullets: [
        'promover violencia, odio, acoso, autolesiones, explotación de menores o cualquier contenido o actividad ilegal;',
        'violar derechos de propiedad intelectual, imagen o privacidad de terceros, incluido el uso de marcas de manera que sugiera falsas aprobaciones;',
        'difundir malware, phishing, spam, estafas o manipular artificialmente métricas de cualquier red en violación de sus términos;',
        'proveer el Servicio a personas o jurisdicciones sujetas a sanciones aplicables;',
        'atacar, sondear, aplicar ingeniería inversa o interrumpir el Servicio, otras plataformas o sus usuarios.',
      ],
    },
    {
      h: '8. Responsabilidades del revendedor',
      bullets: [
        'Los revendedores operan sus propios negocios: fijan sus precios, configuran sus pasarelas de pago, administran a sus clientes y son los únicos responsables del contenido de su storefront y de su atención al cliente.',
        'Los revendedores deben contar con todos los derechos sobre las marcas, logos y dominios que utilicen, y publicar sus propios avisos legales cuando la ley local lo exija.',
        'Los revendedores son responsables del tratamiento de los datos personales de sus propios clientes; GrowthRush actúa como encargado del tratamiento de esos datos.',
      ],
    },
    {
      h: '9. Plataformas y marcas de terceros',
      ps: [
        'Instagram, TikTok, YouTube, Facebook, X/Twitter, Telegram, Spotify, Twitch, WhatsApp y demás nombres y logos de plataformas mencionados en el Servicio son marcas o marcas registradas de sus respectivos titulares.',
        'GrowthRush es un servicio independiente. No está afiliado, avalado, patrocinado ni asociado con ninguna de esas plataformas. Los nombres, logos e íconos de marcas se mencionan únicamente con fines descriptivos (uso nominativo leal) para identificar a qué red corresponde cada servicio.',
        'Todos los nombres de productos, logos, marcas e imágenes pertenecen a sus respectivos titulares. Los titulares que consideren vulnerados sus derechos pueden escribir a legal@growthrush.io para su revisión y remoción inmediata cuando corresponda.',
      ],
    },
    {
      h: '10. Garantías y limitación de garantías',
      ps: [
        'EL SERVICIO SE PROVEE "TAL CUAL" Y "SEGÚN DISPONIBILIDAD", SIN GARANTÍAS DE NINGÚN TIPO, EXPRESAS O IMPLÍCITAS, INCLUIDAS COMERCIABILIDAD, APTITUD PARA UN FIN DETERMINADO Y NO VULNERACIÓN. NO GARANTIZAMOS QUE EL SERVICIO SERÁ ININTERRUPTO O LIBRE DE ERRORES, NI QUE NINGUNA MÉTRICA SERÁ MANTENIDA POR PLATAFORMAS DE TERCEROS.',
      ],
    },
    {
      h: '11. Limitación de responsabilidad',
      ps: [
        'EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, NUESTRA RESPONSABILIDAD AGREGADA POR CUALQUIER RECLAMO RELACIONADO CON EL SERVICIO SE LIMITA AL MONTO QUE NOS HAYAS PAGADO EN LOS DOCE (12) MESES ANTERIORES AL RECLAMO. NO SOMOS RESPONSABLES POR DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES O PUNITIVOS, LUCRO CESANTE, PÉRDIDA DE DATOS O DE REPUTACIÓN, AUN HABIENDO SIDO NOTIFICADOS DE LA POSIBILIDAD.',
      ],
    },
    {
      h: '12. Indemnización',
      ps: [
        'Aceptas indemnizar y mantener indemnes a GrowthRush, sus operadores, afiliados y personal frente a todo reclamo, demanda, pérdida o gasto (incluidos honorarios legales razonables) que surja de tu contenido, tus enlaces, tu uso del Servicio, tu actividad como revendedor o el incumplimiento de estos Términos o de los términos de cualquier plataforma de terceros.',
      ],
    },
    {
      h: '13. Terminación y cambios',
      bullets: [
        'Puedes dejar de usar el Servicio y cerrar tu cuenta en cualquier momento; los términos de plataforma ya pagados continúan hasta su vencimiento.',
        'Podemos modificar estos Términos; los cambios sustanciales se anunciarán en la plataforma o por email al menos 14 días antes de su entrada en vigor. El uso continuado tras esa fecha implica aceptación.',
        'Estos Términos se rigen por las leyes del domicilio de constitución del operador, sin perjuicio de las normas imperativas de protección al consumidor de tu país de residencia, que prevalecen cuando resulten aplicables.',
      ],
    },
    {
      h: '14. Contacto',
      ps: [CONTACT_ES],
    },
  ],
}

const privacyEs: LegalDoc = {
  title: 'Política de Privacidad',
  updated: 'Febrero 2025',
  intro:
    'Esta Política de Privacidad explica cómo GrowthRush recopila, usa, divulga y protege los datos personales cuando utilizas nuestra plataforma, storefronts y paneles, y describe los derechos que tienes sobre esos datos.',
  sections: [
    {
      h: '1. Datos que recopilamos',
      bullets: [
        'Datos de cuenta: nombre, email, contraseña (almacenada solo como hash con sal), moneda e idioma preferidos, zona horaria.',
        'Datos comerciales: pedidos, depósitos, transacciones, facturación, suscripciones a planes, canje de cupones y tickets de soporte.',
        'Datos de plataforma de revendedor: nombre de la plataforma, dominio/subdominio, marca, contenido de la landing y configuración de pasarelas de pago (las credenciales se guardan cifradas y solo se muestran enmascaradas).',
        'Datos técnicos: dirección IP, cookie de sesión, tipo de dispositivo/navegador y registros mínimos de seguridad para prevenir fraude y abuso.',
        'Datos opcionales: tokens o últimos 4 dígitos de tarjetas guardados por ti para agilizar el checkout; nunca almacenamos el número completo de tarjeta ni el CVV.',
      ],
    },
    {
      h: '2. Cómo usamos los datos',
      bullets: [
        'Para operar el Servicio: procesar pedidos, acreditar billeteras, renovar alquileres de plataformas, brindar soporte y prevenir abusos.',
        'Para comunicar información transaccional (estado de pedidos, depósitos, avisos de seguridad) y, si te suscribes, novedades del producto.',
        'Para cumplir obligaciones legales (fiscal, contable, screening de sanciones) y hacer cumplir nuestros Términos.',
        'No vendemos tus datos personales ni los usamos para perfiles publicitarios de terceros.',
      ],
    },
    {
      h: '3. Cookies y almacenamiento local',
      ps: [
        'Usamos una cookie de sesión firmada, httpOnly y estrictamente necesaria para mantenerte identificado, y almacenamiento local para recordar preferencias como el idioma o los banners descartados. Si en el futuro habilitamos cookies analíticas opcionales, se informarán aquí y estarán sujetas a tu consentimiento.',
      ],
    },
    {
      h: '4. Procesadores de pago y terceros',
      bullets: [
        'Los pagos los procesan pasarelas independientes (p. ej. PayPal, MercadoPago, bancos adheridos a Pix, Cryptomus, CoinPayments, Payoneer, adquirentes de tarjetas). Al pagar, el procesador recibe los datos necesarios para completar la transacción bajo su propia política de privacidad.',
        'En storefronts de revendedores, el pago se recibe en las cuentas de la pasarela configurada por el revendedor, quien es responsable de ese tratamiento.',
        'Utilizamos proveedores de hosting, base de datos y envío de emails que tratan los datos por nuestra cuenta bajo acuerdos de tratamiento de datos.',
        'Podemos divulgar datos a autoridades competentes cuando la ley lo exija, o para proteger derechos, propiedad y seguridad.',
      ],
    },
    {
      h: '5. Conservación',
      ps: [
        'Los registros de cuenta y transacciones se conservan mientras tu cuenta esté activa y durante el plazo que exija la ley fiscal y comercial (típicamente hasta 10 años para facturación). Los tickets de soporte se conservan 24 meses y los registros de seguridad 12 meses. Luego los datos se eliminan o anonimizan de forma irreversible.',
      ],
    },
    {
      h: '6. Seguridad',
      bullets: [
        'Las contraseñas se guardan hasheadas (nunca en texto plano), las sesiones usan cookies firmadas httpOnly y las credenciales de pasarelas de pago se cifran en reposo y solo se muestran enmascaradas a su dueño.',
        'El acceso a datos productivos está restringido a personal autorizado y las APIs tienen rate-limiting contra ataques de fuerza bruta. Ningún sistema es 100% seguro: usa contraseñas únicas y activa 2FA cuando esté disponible.',
      ],
    },
    {
      h: '7. Tus derechos',
      bullets: [
        'Acceso, rectificación, supresión, limitación, portabilidad y oposición, y revocación del consentimiento cuando el tratamiento se base en él (p. ej. marketing).',
        'Los residentes del EEE/Reino Unido ejercen derechos GDPR y los residentes de varios estados de EE.UU. derechos CCPA/CPRA escribiendo a privacy@growthrush.io; respondemos dentro de 30 días.',
        'También puedes presentar un reclamo ante la autoridad de protección de datos de tu país.',
        'Si te registraste en el storefront de un revendedor, dirige primero tu solicitud al revendedor; nosotros lo asistiremos como encargados del tratamiento.',
      ],
    },
    {
      h: '8. Menores',
      ps: [
        'El Servicio no está dirigido a menores de 18 años. No recopilamos a sabiendas datos de menores; si lo hacemos, los eliminamos de inmediato.',
      ],
    },
    {
      h: '9. Transferencias internacionales',
      ps: [
        'Tus datos pueden tratarse en países distintos al tuyo. Cuando corresponda, las transferencias se amparan en decisiones de adecuación o cláusulas contractuales estándar con garantías equivalentes.',
      ],
    },
    {
      h: '10. Cambios y contacto',
      ps: [
        'Anunciaremos los cambios sustanciales de esta política en la plataforma antes de su entrada en vigor.',
        CONTACT_ES,
      ],
    },
  ],
}

const responsibilityEs: LegalDoc = {
  title: 'Descargo de Responsabilidad y Marcas',
  updated: 'Febrero 2025',
  intro:
    'Esta página limita la responsabilidad de la plataforma GrowthRush y sus operadores, y aclara el uso de nombres, logos y marcas de terceros en todo el Servicio. Complementa —y no reemplaza— los Términos y la Política de Privacidad.',
  sections: [
    {
      h: '1. Sin afiliación ni aval',
      ps: [
        'GrowthRush es una herramienta SaaS independiente. NO estamos afiliados, asociados, autorizados, avalados ni conectados oficialmente de ninguna manera con Instagram, TikTok, YouTube, Facebook, X, Telegram, WhatsApp, Spotify, Twitch, Kick, LinkedIn, Reddit, Pinterest, Snapchat, Threads ni ninguna otra red social, plataforma de streaming, procesador de pagos o marca mencionada en el Servicio.',
        'Todas las marcas, logos, nombres comerciales, capturas y nombres de productos mostrados pertenecen a sus respectivos titulares y se usan exclusivamente con fines descriptivos y referenciales: para identificar a qué red corresponde un servicio o la compatibilidad de una integración. Dicho uso referencial no implica patrocinio ni aval de ninguna marca.',
      ],
    },
    {
      h: '2. Entrega de métricas "tal cual"',
      ps: [
        'Las métricas de engagement (seguidores, likes, vistas, etc.) existen en sistemas de terceros que no controlamos. Sus titulares pueden cambiar algoritmos, depurar cuentas o ajustar contadores en cualquier momento y sin aviso. Por lo tanto, los resultados entregados mediante el Servicio se proveen "tal cual" y "según disponibilidad", y no garantizamos que las métricas se mantengan, sean visibles o permanentes en ninguna plataforma de terceros.',
        'Cuando un servicio incluye ventana de refill o garantía, nuestra única obligación es reejecutar el pedido afectado dentro de esa ventana; no respondemos por pérdidas derivadas de acciones de plataformas de terceros.',
      ],
    },
    {
      h: '3. Responsabilidad del usuario',
      ps: [
        'Eres el único responsable de los enlaces que envías, de las cuentas que administras, del contenido que promocionas y del cumplimiento de los términos de servicio de cada plataforma de terceros, sus normas de comunidad y las leyes aplicables. Antes de realizar un pedido, asegúrate de que tu actividad no viole esos términos.',
        'Los revendedores son además responsables frente a sus propios clientes, precios, promociones, contenido publicado y cumplimiento legal local (derecho de consumo, impuestos, facturación y sus propios avisos legales).',
      ],
    },
    {
      h: '4. Limitación de responsabilidad',
      ps: [
        'En la máxima medida permitida por la ley, los operadores de GrowthRush no serán responsables por daños indirectos, incidentales, especiales o consecuentes, incluida la pérdida de cuentas, seguidores, ingresos, datos, reputación u oportunidades de negocio, derivados del uso o la imposibilidad de uso del Servicio o de acciones de plataformas de terceros.',
        'La responsabilidad agregada, si la hubiera, se limita a los montos efectivamente pagados por el usuario reclamante en los doce meses previos al evento (según se detalla en los Términos).',
      ],
    },
    {
      h: '5. Indemnidad',
      ps: [
        'Aceptas defender e indemnizar a los operadores, personal y afiliados de GrowthRush frente a todo reclamo de terceros (incluidos reclamos de redes sociales o titulares de marcas) que surja de tu uso del Servicio, tu contenido, tus enlaces o tu actividad como revendedor.',
      ],
    },
    {
      h: '6. Reclamos de marcas',
      ps: [
        'Si eres titular de derechos y consideras que algún contenido disponible mediante el Servicio vulnera tu marca, derechos de autor u otros derechos, escribe a legal@growthrush.io con la identificación del derecho, el material en cuestión y una declaración de buena fe. Los reclamos verificados se revisan de inmediato y el material se elimina o corrige cuando corresponde.',
      ],
    },
    {
      h: '7. Contacto',
      ps: [CONTACT_ES],
    },
  ],
}

export const LEGAL: Record<LegalLang, Record<LegalKey, LegalDoc>> = {
  en: LEGAL_EN,
  es: { terms: termsEs, privacy: privacyEs, responsibility: responsibilityEs },
}

export function legalDoc(key: LegalKey, lang: string | null | undefined): LegalDoc {
  return lang === 'es' ? LEGAL.es[key] : LEGAL.en[key]
}

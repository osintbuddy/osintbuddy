# OSINTBuddy Developer Policies

This document defines the policies governing **community plugins and extensions** for the `osintbuddy/osintbuddy` ecosystem.

Our goal is to enable powerful, extensible investigation workflows **without compromising user safety, privacy, or offline-first operation**. OSINTBuddy is designed as a local-first, analyst-controlled tool; community contributions must uphold those principles.

These policies apply **only** to plugins and extensions distributed through the **official OSINTBuddy plugin registry**. Plugins installed manually or from third-party sources are not covered—but the same standards are strongly encouraged.

---

## Scope

- Applies to **plugins, extensions, and themes** listed in the official OSINTBuddy registry
- Each submission is **individually reviewed**
- Non-compliant submissions may be rejected or removed at any time

---

## Not Allowed

Plugins and themes **must not**:

- Obfuscate code to conceal behavior or intent
- Load or inject **dynamic advertisements** from the network
- Display **static ads** outside the plugin’s own UI surface
- Include **client-side telemetry** or tracking
- Implement **self-updating mechanisms**
- Bypass or weaken OSINTBuddy’s sandboxing or permission model
- Execute hidden background processes unrelated to declared functionality
- Load remote assets at runtime without explicit disclosure

Themes must **not** fetch fonts, images, or other assets from the network. All assets must be bundled locally.

---

## ⚠️ Required Disclosures

The following behaviors are permitted **only if clearly and explicitly disclosed** in the plugin’s `README.md`:

- Paid features or license-gated functionality
- Required user accounts or authentication
- Network access
  - Clearly state **which services** are contacted
- Access to files outside the OSINTBuddy workspace
  - Explain scope and justification
- Static advertisements within the plugin’s own UI
- Server-side telemetry
  - Must include a linked **privacy policy**
  - Must explain data collected, retention, and purpose
- Closed-source or partially closed-source code
  - Reviewed on a **case-by-case basis**

Undisclosed behavior is grounds for immediate removal.

---

## Licensing & Copyright

All community plugins and themes must:

- Include a `LICENSE` file
- Clearly state the license in the README
- Comply with the licenses of all third-party dependencies
- Provide attribution where required
- Avoid misuse of the **OSINTBuddy name, branding, or logos**
  - Do not imply first-party or official endorsement unless explicitly granted

---

## Reporting Violations

If you discover a plugin or theme that violates these policies:

1. Open an issue in the plugin’s GitHub repository
2. Check for existing reports before filing a new one
3. Allow the developer **14 days** to respond and remediate

If no response is received or in cases of serious violations contact the OSINTBuddy maintainers directly.

---

## Removal Policy

In the event of a violation, maintainers may:

- Notify the developer and allow a reasonable remediation window
- Remove the plugin or theme if the issue is not resolved

Immediate removal may occur if:

- The plugin appears malicious
- The developer is uncooperative
- There are repeated or willful violations
- User safety or data integrity is at risk

We may also remove plugins that are:

- Abandoned
- Severely broken
- Incompatible with current OSINTBuddy releases

---

## Final Note

OSINTBuddy plugins are investigative instruments.  
They must be **transparent, inspectable, predictable, and accountable**.

If a plugin cannot be trusted by an analyst operating in hostile or high-risk environments, it does not belong in the ecosystem.

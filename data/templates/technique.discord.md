{{! The server's own technique format. Paste the output straight into the channel.          }}
{{!                                                                                         }}
{{! Two things the server format has that the technique record does not yet have fields for: }}
{{!   `[ Reversal ]` / `[ Imaginary ]`, and the Domain Expansion breakdown                   }}
{{!   (Type / Range / Effect Type / Refinement).                                             }}
{{! The blocks for them are below and render nothing until those fields exist — say the word }}
{{! and they can be added to the technique schema.                                           }}
⋙《 {{name}} 》

*{{grade}}{{#techniqueTypeLabel}} · {{techniqueTypeLabel}}{{/techniqueTypeLabel}}*

➤ 『𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍』
{{#principle}}{{principle}}
{{/principle}}{{#application}}
{{application}}
{{/application}}

{{#reversal}}`[ Reversal ]`
{{reversal}}
{{/reversal}}{{#imaginary}}`[ Imaginary ]`
{{imaginary}}
{{/imaginary}}

{{#anyExtensions}}`[ Extensions ]`

{{/anyExtensions}}{{#extensions}}- {{.}}
{{/extensions}}

{{#maximum}}`[ Maximum Techniques ]`

{{maximum}}
{{/maximum}}

{{#domain}}`[ Domain Expansion ]`

{{domain}}
{{#domainType}}Type: {{domainType}}
{{/domainType}}{{#domainRange}}Range: {{domainRange}}
{{/domainRange}}{{#domainEffectType}}Effect Type: {{domainEffectType}}
{{/domainEffectType}}{{#domainRefinement}}Refinement: {{domainRefinement}}
{{/domainRefinement}}{{/domain}}

{{#anyShikigami}}`[ Shikigami ]`

{{/anyShikigami}}{{#shikigami}}- {{.}}
{{/shikigami}}

{{#cost}}Rough cost: {{cost}}
{{/cost}}{{#limitation}}Limitation: {{limitation}}
{{/limitation}}{{#tell}}Tell: {{tell}}
{{/tell}}
{{#notes}}||{{notes}}||
{{/notes}}

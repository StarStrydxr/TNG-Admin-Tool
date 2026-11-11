{{! Trait. Keys come from domain/export-context.ts — edit this file freely. }}
# {{name}}

*{{rarity}} · {{cost}}{{#acquisition}} · {{acquisition}}{{/acquisition}}*

{{#description}}{{description}}{{/description}}

{{#permission}}> {{permission}}{{/permission}}

{{#anyBonuses}}## Bonuses

{{/anyBonuses}}{{#bonuses}}- {{.}}
{{/bonuses}}

{{#anyDrawbacks}}## Drawbacks

{{/anyDrawbacks}}{{#drawbacks}}- {{.}}
{{/drawbacks}}

{{#anyBonuses}}*Recorded, never applied — the Classes on a sheet are whatever was typed there.*
{{/anyBonuses}}

{{#anyRequirements}}## Requirements

{{/anyRequirements}}{{#requirements}}- {{.}}
{{/requirements}}

{{#source}}**Source:** {{source}}{{/source}}

{{#slot}}**Slot:** {{slot}}{{/slot}}

{{#anyLinks}}## Connected

{{/anyLinks}}{{#links}}- {{.}}
{{/links}}

{{#notes}}## Notes

{{notes}}
{{/notes}}
{{#folder}}
---

Filed under {{folder}}.
{{/folder}}

{{! Defect. Keys come from domain/export-context.ts — edit this file freely. }}
# {{name}}

*Defect{{#cost}} · {{cost}}{{/cost}}{{#source}} · {{source}}{{/source}}*

{{#description}}{{description}}{{/description}}

{{#anyDrawbacks}}## Drawbacks

{{/anyDrawbacks}}{{#drawbacks}}- {{.}}
{{/drawbacks}}

{{#anyBonuses}}## Bonuses

{{/anyBonuses}}{{#bonuses}}- {{.}}
{{/bonuses}}

{{#anyDrawbacks}}*Recorded, never applied — the Classes on a sheet are whatever was typed there.*
{{/anyDrawbacks}}

{{#anyRequirements}}## Requirements

{{/anyRequirements}}{{#requirements}}- {{.}}
{{/requirements}}

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

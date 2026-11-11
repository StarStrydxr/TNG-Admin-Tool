# Bounty — {{target}}

{{! Obsidian resolves the embed below by searching the vault, so it survives being moved.  }}
{{! Outside Obsidian use the relative form instead, which is the imagePath key.            }}
{{#imageEmbed}}{{imageEmbed}}
{{/imageEmbed}}

**Threat grade:** {{grade}}  
{{#targetGrade}}**Target ranked:** {{targetGrade}}  {{/targetGrade}}
{{#conspicuousity}}**Conspicuousity:** {{conspicuousity}}  {{/conspicuousity}}
{{#state}}**State:** {{state}}  {{/state}}
{{#issuer}}**Issued by:** {{issuer}}{{/issuer}}

{{#anyPings}}**Pings:** {{/anyPings}}{{#pings}}{{.}} {{/pings}}

{{#crime}}## Wanted for

{{crime}}
{{/crime}}

{{#briefing}}{{briefing}}{{/briefing}}

{{#warning}}> {{warning}}
{{/warning}}

{{#anyObjectives}}## Objectives

{{/anyObjectives}}{{#objectives}}- {{.}}
{{/objectives}}

{{#anyRewards}}## Rewards

{{/anyRewards}}{{#rewards}}- {{.}}
{{/rewards}}

{{#anyLinks}}## Linked

{{/anyLinks}}{{#links}}- {{.}}
{{/links}}

{{#notes}}## Notes

{{notes}}
{{/notes}}
{{#seed}}
---

*Generated from seed `{{seed}}`.*
{{/seed}}

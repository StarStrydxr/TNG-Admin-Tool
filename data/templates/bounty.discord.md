{{! The server's own bounty format. Paste straight into the channel.                        }}
{{! Discord cannot embed a local file from text, so the picture is named rather than linked  }}
{{! — attach it to the same message. The line is a reminder, not part of the posting.        }}
{{#conspicuousity}}`Conspicuousity:` {{conspicuousity}}
{{/conspicuousity}}{{#state}}`State:` {{state}}
{{/state}}{{#anyPings}}`Pings:` {{/anyPings}}{{#pings}}@{ {{.}} } {{/pings}}
{{#target}}`Target:` {{target}}
{{/target}}

```
{{#crime}}Guilty of {{crime}}.

{{/crime}}{{#briefing}}{{briefing}}

{{/briefing}}{{#warning}}{{warning}}
{{/warning}}{{#threatNote}}
{{threatNote}}
{{/threatNote}}```

{{#anyObjectives}}**[ OBJECTIVES ]**
{{/anyObjectives}}{{#objectives}}- {{.}}
{{/objectives}}

{{#anyRewards}}**[ REWARDS ]**
{{/anyRewards}}{{#rewards}}- {{.}}
{{/rewards}}
{{#issuer}}
— {{issuer}}
{{/issuer}}
{{#image}}
||Attach the picture: {{image}}||
{{/image}}
{{#notes}}||{{notes}}||
{{/notes}}

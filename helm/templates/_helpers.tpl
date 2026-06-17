---
{{- define "interview-demo.labels" -}}
app.kubernetes.io/managed-by: {{ .Values.global.labels.managed-by | quote }}
app.kubernetes.io/part-of: {{ .Values.global.labels.part-of | quote }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{- define "interview-demo.selectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ $.Release.Name }}
{{- end }}

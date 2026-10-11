!macro customInit
  IfFileExists "$EXEDIR\apphub-${VERSION}-x64.nsis.7z" package_present 0
  MessageBox MB_OK|MB_ICONSTOP "Keep AppHub Setup ${VERSION}.exe and apphub-${VERSION}-x64.nsis.7z together in the same folder. The package includes both offline AI models."
  Abort
  package_present:
!macroend
!macro customInstall
  ; Preserve the offline package beside Setup for later reuse.
  IfFileExists "$EXEDIR\apphub-${VERSION}-x64.nsis.7z" package_kept 0
  CopyFiles /SILENT "$LOCALAPPDATA\${APP_PACKAGE_STORE_FILE}" "$EXEDIR\apphub-${VERSION}-x64.nsis.7z"
  package_kept:
!macroend

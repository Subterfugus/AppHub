# Privacy

AppHub has no account system or telemetry. Application inventory, machine name, favorites, tags, query vectors, local model paths, package history, and error logs are stored on the user's PC. Error logs can contain local paths; they are bounded and are not uploaded. Local AI inference does not send queries to a hosted model. WinGet operations and explicit development model downloads use the network independently.

This public repository contains source, synthetic test fixtures, generic documentation, application branding, and third-party license notices. It excludes actual machine inventories, exported libraries, screenshots, local verification reports, caches, model weights, downloaded native binaries, credentials, and local Git history.

Automated integration tests can generate machine-specific logs, paths, software listings and screenshots. Their qa-output/ and .qa/ directories are ignored. Inspect any future attachments or commits before publishing them. Commit authors use a project identity rather than a personal email address.

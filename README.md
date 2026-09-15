# Crizon — GitHub APK Build

Extract the ZIP and put its contents directly into the root of the GitHub repository.

## GitHub Actions build
1. Upload the extracted project files/folders to the repository root.
2. Push to `main`, or open **Actions → Build Crizon APK → Run workflow**.
3. The workflow installs dependencies with `npm install --legacy-peer-deps`.
4. It does not use npm cache, so a `package-lock.json` is not required for the cache step.
5. It creates the Android debug keystore required by this project's release build configuration.
6. It builds `android/app/build/outputs/apk/release/app-release.apk`.
7. The APK is uploaded as the `crizon-release-apk` artifact.

## Firebase Android config
The workflow expects the Android Firebase configuration as the GitHub Actions secret `GOOGLE_SERVICES_JSON` and writes it to `android/app/google-services.json` during the build.

## Credentials
The credential/config values that were actually present in the supplied source have been kept in `src/config/credentials.ts` as requested. The supplied source itself contained an abbreviated Firebase Admin private-key placeholder rather than the full key, so the missing key text cannot be reconstructed from that ZIP.

## Build-error fix included
The previous workflow failed at `actions/setup-node` because `cache: npm` was enabled without `package-lock.json`. This version removes that cache requirement and updates `actions/setup-node` to v5 while keeping Node 20 for this React Native 0.73 project.

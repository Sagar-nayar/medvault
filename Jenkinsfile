// MedVault CI/CD pipeline
// Build -> Test -> Code Quality -> Security -> Deploy (staging) -> Release (production) -> Monitoring
// every stage is a gate: if one fails, nothing after it runs, so bad code never reaches prod

pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
    timeout(time: 40, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  // github webhooks cant reach localhost, so jenkins checks github every 2 min instead
  triggers {
    pollSCM('H/2 * * * *')
  }

  parameters {
    booleanParam(name: 'SIMULATE_INCIDENT', defaultValue: false,
      description: 'After release, fire a burst of denied access attempts at production and check the security alert reaches Discord')
  }

  environment {
    REGISTRY         = 'localhost:5000'
    IMAGE_REPO       = 'localhost:5000/medvault'
    STAGING_URL      = 'http://medvault-staging:3000'
    PROD_URL         = 'http://medvault-production:3000'
    PROMETHEUS_URL   = 'http://prometheus:9090'
    ALERTMANAGER_URL = 'http://alertmanager:9093'
    GRAFANA_URL      = 'http://grafana:3000'
    SONAR_HOST_URL   = 'https://sonarcloud.io'
  }

  stages {

    // 1. BUILD: versioned docker image pushed to the registry + source tarball archived
    stage('Build') {
      steps {
        script {
          def pkg = readJSON file: 'package.json'
          def parts = pkg.version.tokenize('.')
          env.APP_VERSION = "${parts[0]}.${parts[1]}.${env.BUILD_NUMBER}"
          env.GIT_SHORT   = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          env.IMAGE       = "${env.IMAGE_REPO}:${env.APP_VERSION}"
          currentBuild.displayName = "#${env.BUILD_NUMBER}  v${env.APP_VERSION}"
          currentBuild.description = "commit ${env.GIT_SHORT}"
        }
        sh 'node --version && docker --version && docker compose version'
        sh 'npm ci --no-audit --no-fund'
        sh '''
          docker build \
            --build-arg APP_VERSION=${APP_VERSION} \
            --build-arg GIT_COMMIT=${GIT_SHORT} \
            --label org.opencontainers.image.version=${APP_VERSION} \
            --label org.opencontainers.image.revision=${GIT_COMMIT} \
            --label org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
            --label org.opencontainers.image.source=${GIT_URL} \
            -t ${IMAGE} .
          docker push ${IMAGE}
        '''
        sh '''
          mkdir -p dist
          tar -czf dist/medvault-${APP_VERSION}.tgz server public package.json package-lock.json
          docker image inspect ${IMAGE} --format '{{.Id}} {{.Size}}' > dist/image-${APP_VERSION}.txt
          jq -n --arg v "$APP_VERSION" --arg c "$GIT_COMMIT" --arg i "$IMAGE" --arg b "$BUILD_URL" \
            '{version:$v, commit:$c, image:$i, build:$b}' > dist/build-info.json
        '''
      }
      post {
        success {
          archiveArtifacts artifacts: 'dist/*', fingerprint: true
        }
      }
    }

    // 2. TEST: unit + integration tests with a coverage gate (thresholds in vitest.config.js)
    stage('Test') {
      steps {
        sh 'npm run test:ci'
      }
      post {
        always {
          junit testResults: 'reports/junit.xml', allowEmptyResults: true
          recordCoverage(tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']],
                         id: 'coverage', name: 'Test Coverage', sourceCodeRetention: 'EVERY_BUILD')
          publishHTML(target: [reportName: 'Coverage Report', reportDir: 'coverage', reportFiles: 'index.html',
                               keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
        }
      }
    }

    // 3. CODE QUALITY: eslint (strict, 0 warnings) + SonarCloud + our own quality gate
    stage('Code Quality') {
      steps {
        sh 'mkdir -p reports'
        script {
          env.LINT_STATUS = sh(script: 'npm run lint:ci', returnStatus: true).toString()
          sh 'npx eslint . --format json --output-file reports/eslint.json || true'
        }
        withCredentials([string(credentialsId: 'sonarcloud-token', variable: 'SONAR_TOKEN')]) {
          sh 'npx --yes @sonar/scan@4 -Dsonar.projectVersion=${APP_VERSION}'
          sh 'npm run quality:gate'
        }
        script {
          if (env.LINT_STATUS != '0') {
            error('ESLint quality gate failed (see the ESLint Warnings report)')
          }
        }
      }
      post {
        always {
          recordIssues(enabledForFailure: true, aggregatingResults: true,
                       tools: [esLint(pattern: 'reports/eslint-checkstyle.xml')])
          archiveArtifacts artifacts: 'reports/quality-gate.json, reports/eslint*.xml, reports/eslint.json', allowEmptyArchive: true
        }
      }
    }

    // 4. SECURITY: three scanners in parallel, each one can block the build
    stage('Security') {
      parallel {
        stage('Dependencies: npm audit') {
          steps { sh 'bash scripts/security/npm-audit.sh' }
        }
        stage('SAST: Semgrep') {
          steps { sh 'bash scripts/security/semgrep.sh' }
        }
        stage('Container + Secrets: Trivy') {
          steps { sh 'bash scripts/security/trivy.sh' }
        }
      }
      post {
        always {
          sh 'node scripts/security-summary.mjs || true'
          archiveArtifacts artifacts: 'reports/security/**', allowEmptyArchive: true
          publishHTML(target: [reportName: 'Security Summary', reportDir: 'reports/security', reportFiles: 'summary.html',
                               keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
        }
      }
    }

    // 5. DEPLOY: same image to staging via docker compose, then smoke test the live container
    stage('Deploy (Staging)') {
      steps {
        withCredentials([string(credentialsId: 'session-secret-staging', variable: 'SESSION_SECRET')]) {
          sh 'bash scripts/deploy.sh staging ${APP_VERSION}'
        }
        script {
          try {
            sh '''TARGET_URL=${STAGING_URL} EXPECTED_VERSION=${APP_VERSION} EXPECTED_ENV=staging \
                  npx vitest run --config vitest.smoke.config.js --reporter=default --reporter=junit \
                  --outputFile.junit=reports/junit-smoke-staging.xml'''
          } catch (err) {
            sh 'bash scripts/rollback.sh staging || true'
            throw err
          }
        }
      }
      post {
        always { junit testResults: 'reports/junit-smoke-staging.xml', allowEmptyResults: true }
      }
    }

    // 6. RELEASE: promote the exact same image to production, smoke test, then tag + GitHub release
    stage('Release (Production)') {
      when {
        expression { return (env.GIT_BRANCH ?: '').endsWith('main') }
      }
      steps {
        withCredentials([string(credentialsId: 'session-secret-production', variable: 'SESSION_SECRET')]) {
          sh 'bash scripts/deploy.sh production ${APP_VERSION}'
        }
        script {
          try {
            sh '''TARGET_URL=${PROD_URL} EXPECTED_VERSION=${APP_VERSION} EXPECTED_ENV=production \
                  npx vitest run --config vitest.smoke.config.js --reporter=default --reporter=junit \
                  --outputFile.junit=reports/junit-smoke-production.xml'''
          } catch (err) {
            sh 'bash scripts/rollback.sh production || true'
            throw err
          }
        }
        withCredentials([usernamePassword(credentialsId: 'github-pat', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
          sh 'bash scripts/release.sh ${APP_VERSION}'
        }
      }
      post {
        always {
          junit testResults: 'reports/junit-smoke-production.xml', allowEmptyResults: true
          archiveArtifacts artifacts: 'dist/release-*.json', allowEmptyArchive: true
        }
      }
    }

    // 7. MONITORING: deploy prometheus/grafana/alertmanager as code, prove prod is being watched
    stage('Monitoring') {
      steps {
        withCredentials([
          string(credentialsId: 'discord-webhook', variable: 'DISCORD_WEBHOOK_URL'),
          usernamePassword(credentialsId: 'grafana-admin', usernameVariable: 'GRAFANA_USER', passwordVariable: 'GRAFANA_PASSWORD')
        ]) {
          sh 'bash scripts/monitoring/deploy-monitoring.sh'
          sh 'bash scripts/monitoring/verify-monitoring.sh'
          sh 'node scripts/simulate-traffic.mjs --base-url ${PROD_URL} --duration 20'
          sh 'bash scripts/monitoring/annotate-release.sh'
          script {
            if (params.SIMULATE_INCIDENT) {
              sh 'bash scripts/monitoring/incident-drill.sh'
            }
          }
        }
      }
    }
  }

  post {
    success {
      withCredentials([string(credentialsId: 'discord-webhook', variable: 'DISCORD_WEBHOOK_URL')]) {
        sh '''bash scripts/notify-discord.sh success "MedVault v${APP_VERSION} is live in production.
Commit ${GIT_SHORT}. App: http://localhost:3000  Grafana: http://localhost:3030"'''
      }
    }
    failure {
      withCredentials([string(credentialsId: 'discord-webhook', variable: 'DISCORD_WEBHOOK_URL')]) {
        sh '''bash scripts/notify-discord.sh failure "Build v${APP_VERSION:-unknown} FAILED. Production was not changed. Check the console log."'''
      }
    }
  }
}

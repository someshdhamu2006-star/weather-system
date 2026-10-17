
stage('Push to Docker Hub') {
    steps {
        withCredentials([usernamePassword(
            credentialsId: 'dockerhub-creds',
            usernameVariable: 'DOCKER_USER',
            passwordVariable: 'DOCKER_PASS'
        )]) {
            bat '''
                @echo off
                setlocal DisableDelayedExpansion
                "%DOCKER%" --version
                powershell -NoProfile -Command "$env:DOCKER_PASS | & docker login --username $env:DOCKER_USER --password-stdin"
                if errorlevel 1 exit /b 1
                docker push %IMAGE_NAME%
                if errorlevel 1 exit /b 1
                docker logout
            '''
        }
    }
}

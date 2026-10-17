
pipeline {
    agent any

    environment {
        IMAGE_NAME = 'somesh2404/weather-forecasting-system:1.0'
        LOCAL_IMAGE = 'weather-forecast-system:1.0'
        KUBECONFIG = 'C:\\Users\\LENOVO\\.kube\\config'
        KUBECTL = 'C:\\Users\\LENOVO\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\kubectl.exe'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Weather Forecast System'
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t %LOCAL_IMAGE% -t %IMAGE_NAME% .'
            }
        }

        stage('Run Docker Container') {
            steps {
                bat 'docker stop weather-jenkins || exit /b 0'
                bat 'docker rm weather-jenkins || exit /b 0'
                bat 'docker run -d --name weather-jenkins -p 8082:80 %LOCAL_IMAGE%'
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    bat '''
                        @echo off
                        echo %DOCKER_PASS% | docker login --username %DOCKER_USER% --password-stdin
                        if errorlevel 1 exit /b 1
                        docker push %IMAGE_NAME%
                        if errorlevel 1 exit /b 1
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat '''
                    "%KUBECTL%" apply -f deployment.yaml
                    if errorlevel 1 exit /b 1
                    "%KUBECTL%" rollout status deployment/weather-forecasting-system --timeout=120s
                '''
            }
        }
    }
}

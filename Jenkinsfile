
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
                echo 'Checking out Weather Forecast System'
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t %LOCAL_IMAGE% .'
            }
        }

        stage('Run Docker Container') {
            steps {
                bat '''
                    docker stop weather-jenkins 2>NUL
                    docker rm weather-jenkins 2>NUL
                    docker run -d --name weather-jenkins -p 8082:80 %LOCAL_IMAGE%
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat '''
                    "%KUBECTL%" apply -f deployment.yaml
                    if errorlevel 1 exit /b 1

                    "%KUBECTL%" rollout status deployment/weather-forecasting-system --timeout=120s
                    if errorlevel 1 exit /b 1

                    "%KUBECTL%" get pods
                    "%KUBECTL%" get services
                '''
            }
        }
    }

    post {
        success {
            echo 'Weather Forecast System pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check Console Output.'
        }
    }
}

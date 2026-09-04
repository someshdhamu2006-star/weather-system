pipeline {
    agent any

    stages {
        stage('Clone') {
            steps {
                echo 'Weather Forecasting System'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t weather .'
            }
        }

        stage('Run Container') {
            steps {
                bat 'docker stop weather || exit 0'
                bat 'docker rm weather || exit 0'
                bat 'docker run -d -p 8081:80 --name weather weather'
            }
        }
    }
}
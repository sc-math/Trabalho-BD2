# Trabalho BD2 - Loja Virtual

Projeto da disciplina e Banco de Dados 2 com foco em segurança, controle de acesso, backup e recuperação 
usando PostgreSQL, FastAPI, React e Docker.

## Como rodar o projeto?

O projeto inteiro está dockerizado, então não precisa instalar nenhum tipo de biblioteca. 

Pré-requisito:

- Instalar **Docker Desktop** (Windows/Linux) ou **Docker CLI** (Linux).

Na raiz do projeto:
```
docker-compose up -d --build
```

Para iniciar os containers já criados:
```
docker-compose start
```

Para parar os containers sem apagar os dados:
```
docker-compose stop
```

## Portas

| Serviço                       | URL/Host                   |
|-------------------------------|----------------------------|
| Frontend Loja (React)         | http://localhost:3001      |
| Frontend Admin (React)        | http://localhost:3000      |
| Backend API (FastAPI)         | http://localhost:8000      |
| Documentação da API           | http://localhost:8000/docs |
| Banco de Dados (PostgreSQL)   | localhost:5432             |
| Interface Banco (pgAdmin Web) | http://localhost:5050      | 

## Conexão com o PostgreSQL

Usando o pgAdmin ou DataGrip/DBeaver instalado no Windows

| Campo | Valor |
| --- | --- |
| Host | localhost |
| Porta | 5432 |
| Database | lojavirtual |
| User | postgres |
| Password | postgres_super_secure_pass_987 |

Usando o pgAdmin Web do Docker

| Campo | Valor |
| --- | --- |
| Host | db |
| Porta | 5432 |
| Database | lojavirtual |
| User | postgres |
| Password | postgres_super_secure_pass_987 |

Observação
O host muda porque o pgAdmin do Docker acessa o banco pela rede interna do Docker Compose, onde o serviço do 
PostgreSQL se chama ``db``.
FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /source
COPY pom.xml ./
COPY src ./src
RUN mvn -B verify

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --create-home app \
    && mkdir -p /data/uploads/avatars /data/uploads/company \
    && chown -R app:app /app /data
COPY --from=build --chown=app:app /source/target/auth-service-0.0.1-SNAPSHOT.jar /app/app.jar
ENV SPRING_PROFILES_ACTIVE=prod
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

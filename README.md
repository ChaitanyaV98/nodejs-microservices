# Social Media microservices project

- The main idea of this project is to divide and work on multiple modules seperately, bringing interservice communication between servicess wherever required and services independently.
  **Main Features include:**
  - This project contains identity service, post service, media service and search service.
  - running each service separately without affecting each others.
  - bringing connection between services like post and media i.e when the post is deleted the related media need to get deleted from the media db and from cloudinary.
  - also bringing connection between post and search service. whenever post is created, when update the post related details in the search service so as that user can search based on the content separately.
  - Also for an user to create post or upload media he is should be able to authenticated first.

## API Gateway

- This server basically runs on port number 3000, where the server is passed through middlewares like helmet, cors, express rate limiter which is used to add base rate limiting for sensitive endpoints.
- Also, added proxy services for identity service, post service, media service and search service
  so via port 3000 we can proxy to 3001, 3002, 3003, 3004.
- Added docker file for this service which will tell docker that this container to listen to 3000 port at our runtime

## Identity service

- Contains authentication module with

  - user registration
  - user login
  - user Logout
  - generate tokens for the user.
  - The service runs on port 3001

  ## Post service

  - user can create a new post with content and mediaIds[oprional]
  - user can fetch all the posts that are saved.
  - user can fetch a single post based on the post id.
  - user can delete a post.
  - also we have used io-redis inorder to cache the data when creating a post.

  ## Media service

  - user can upload media to cloudinary which will also get saved on our database.
  - user can also fetch all the media files that have been uploaded by a particular user.
  - Basically we are uploading images to cloud.
  - User can use these uploaded images with media ids while creating the posts.
  - when the user deletes a particular post then respective media will get deleted from cloud and also from the media collection.

## Search service.

- When a particular post is created respective postId, content, userId will get saved on the searches collection.
- When a post is created we will publish an event to search service which will consume the post related details and save the details via event listener which is created in search service.
- Also we have search for posts api which we can search using the content by passing the text via query param.
- When a particular post is deleted, the corresponding data need to get deleted from the search collection, which is also been handled.

## Tech used are:

- Express.
- Mongodb
- Winston for logging the info and saving the data in the files called combined.log file and error.log file
- RabbitMq for creating/publishing/subscribe connection.
- JWT for auth services like creating tokens/validating and fetching details if we have tokens.
- JOI for schema validation.
- CORS middleware.
- express rate limiter

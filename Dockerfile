# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Ensure all files have the correct permissions
RUN chmod -R 755 /app

# Build the Next.js application
RUN npm run build

# Expose the port your app will run on
EXPOSE 3000

# Define the command to start your app
CMD ["npm", "start"]

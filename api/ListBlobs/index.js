const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  const containerURL = process.env.containerURL; // e.g., https://youraccount.blob.core.windows.net/yourcontainer
  const sasToken = process.env.sasToken;         // e.g., sp=racwdl&st=...&sig=...

  try {
    if (!containerURL || !sasToken) {
      throw new Error("Missing required environment variables.");
    }

    // Extract container name from URL
    const url = new URL(containerURL);
    const containerName = url.pathname.split("/")[1];

    // Create BlobServiceClient using origin + SAS token
    const blobServiceClient = new BlobServiceClient(`${url.origin}?${sasToken}`);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push(blob.name);
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: blobs
    };
  } catch (error) {
    context.log("Error listing blobs:", error.message);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        message: "Error listing blobs",
        error: error.message
      }
    };
  }
};

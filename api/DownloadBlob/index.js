const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  try {
    const blobName = req.query.name;
    if (!blobName) {
      context.res = {
        status: 400,
        body: "يرجى تحديد اسم الملف باستخدام المعامل ?name="
      };
      return;
    }

    // استرجاع المتغيرات من البيئة
    const containerURLDownload = process.env.containerURLDownload;       // بدون اسم الحاوية
    const sasToken = process.env.sasToken;                       // بدون ?
    const containerName = process.env.containerName;     // اسم الحاوية فقط

    if (!containerURLDownload || !sasToken || !containerName) {
      context.res = {
        status: 500,
        body: "بعض متغيرات البيئة غير معرفة (containerURLDownload, sasToken, containerNameDownload)."
      };
      return;
    }

    const blobServiceClient = new BlobServiceClient(`${containerURLDownload}?${sasToken}`);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const exists = await blockBlobClient.exists();
    if (!exists) {
      context.res = {
        status: 404,
        body: `الملف '${blobName}' غير موجود في الحاوية '${containerName}'.`
      };
      return;
    }

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);

    context.res = {
      status: 200,
      headers: {
        "Content-Type": downloadResponse.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${blobName}"`
      },
      body: downloaded
    };

  } catch (err) {
    context.log("خطأ في التحميل:", err.message);
    context.res = {
      status: 500,
      body: "فشل في تحميل الملف: " + err.message
    };
  }
};

// تحويل stream إلى buffer
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

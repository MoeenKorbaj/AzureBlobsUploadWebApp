const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  try {
    // التحقق من هوية المستخدم وصلاحياته
    const principalHeader = req.headers["x-ms-client-principal"];
    if (!principalHeader) {
      context.res = {
        status: 401,
        body: "غير مصرح. يرجى تسجيل الدخول."
      };
      return;
    }

    const decoded = Buffer.from(principalHeader, "base64").toString("ascii");
    const user = JSON.parse(decoded);

    if (!user.userRoles || !user.userRoles.includes("admin")) {
      context.res = {
        status: 403, 
        body: "ليس لديك صلاحية الحذف. مطلوب صلاحية مسؤول (admin)."
      };
      return;
    }

    // تنفيذ الحذف إذا كان المستخدم Admin
    const blobName = req.query.name;
    if (!blobName) {
      context.res = {
        status: 400,
        body: "يرجى تحديد اسم الملف"
      };
      return;
    }

    const containerURL = process.env.containerURL;
    const sasToken = process.env.sasToken;

    const url = new URL(containerURL);
    const containerName = url.pathname.split("/")[1];

    const blobServiceClient = new BlobServiceClient(`${url.origin}?${sasToken}`);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();

    context.res = {
      status: 200,
      body: "تم حذف الملف بنجاح"
    };
  } catch (error) {
    context.log(error.message);
    context.res = {
      status: 500,
      body: "فشل في حذف الملف: " + error.message
    };
  }
};

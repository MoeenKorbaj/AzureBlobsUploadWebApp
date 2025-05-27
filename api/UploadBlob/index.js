const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  try {
    // ✅ التحقق من الصلاحية - فقط الأدمن مسموح له
    const encodedPrincipal = req.headers["x-ms-client-principal"];
    if (!encodedPrincipal) {
      context.res = {
        status: 401,
        body: "غير مصرح - لم يتم تسجيل الدخول"
      };
      return;
    }

    const decodedPrincipal = Buffer.from(encodedPrincipal, "base64").toString("utf8");
    const principal = JSON.parse(decodedPrincipal);
    const roles = principal.userRoles || [];

    if (!roles.includes("admin")) {
      context.res = {
        status: 403,
        body: "ممنوع - تحتاج إلى صلاحيات المسؤول"
      };
      return;
    }

    // ✅ التحقق من البيانات المطلوبة
    const { fileName, fileContent, fileType } = req.body;

    if (!fileName || !fileContent) {
      context.res = {
        status: 400,
        body: "يرجى إرسال fileName و fileContent (Base64)"
      };
      return;
    }

    const blobServiceClient = new BlobServiceClient(
      `${process.env.containerURL}?${process.env.sasToken}`
    );

    const containerClient = blobServiceClient.getContainerClient("");
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    const buffer = Buffer.from(fileContent, "base64");

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: fileType || "application/octet-stream"
      }
    });

    context.res = {
      status: 200,
      body: "تم رفع الملف بنجاح"
    };
  } catch (error) {
    context.log(error.message);
    context.res = {
      status: 500,
      body: "فشل في رفع الملف"
    };
  }
};

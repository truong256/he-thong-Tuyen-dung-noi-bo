using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitmentAI.Models;
using System.Diagnostics;

namespace RecruitmentAI.Controllers
{
    public class ErrorController : Controller
    {
        [AllowAnonymous]
        [Route("Error/{code:int}")]
        public new IActionResult StatusCode(int code)
        {
            var model = new ErrorViewModel
            {
                RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier
            };

            switch (code)
            {
                case 403:
                    Response.StatusCode = 403;
                    model.StatusCode = "403";
                    model.Title = "Không có quyền truy cập";
                    model.Message = "Bạn không có quyền truy cập vào chức năng này.";
                    model.Hint = "Vui lòng quay lại hoặc liên hệ quản trị viên nếu bạn cho rằng mình cần quyền truy cập.";
                    break;

                case 404:
                    Response.StatusCode = 404;
                    model.StatusCode = "404";
                    model.Title = "Không tìm thấy trang";
                    model.Message = "Đường dẫn bạn truy cập không tồn tại hoặc đã bị thay đổi.";
                    model.Hint = "Vui lòng kiểm tra lại đường dẫn hoặc quay về trang chủ.";
                    break;

                default:
                    Response.StatusCode = code;
                    model.StatusCode = code.ToString();
                    model.Title = "Đã xảy ra lỗi";
                    model.Message = "Hệ thống gặp sự cố khi xử lý yêu cầu của bạn.";
                    model.Hint = "Vui lòng thử lại hoặc liên hệ quản trị viên.";
                    break;
            }

            return View("StatusError", model);
        }

        [AllowAnonymous]
        [Route("Error")]
        public IActionResult Index()
        {
            var model = new ErrorViewModel
            {
                RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier,
                StatusCode = "500",
                Title = "Đã xảy ra lỗi",
                Message = "Hệ thống gặp sự cố không mong muốn.",
                Hint = "Vui lòng thử lại hoặc liên hệ quản trị viên."
            };
            return View("StatusError", model);
        }
    }
}
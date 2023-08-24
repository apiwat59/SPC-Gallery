using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Velzon.Models;
using Velzon.Util; // Don't forget to include the namespace for GalleryHelper

namespace Velzon.Controllers
{
    public class PagesController : Controller
    {
        [ActionName("Gallery")]
        public IActionResult Gallery()
        {
            try
            {
                var galleryItems = GalleryHelper.GetGalleryItems();
                if (galleryItems == null)
                {
                    return View("Error"); // Handle error or return appropriate view
                }

                return View(galleryItems);
            }
            catch (Exception ex)
            {
                // Handle exception or return appropriate view
                return View("Error");
            }
        }
    }
}

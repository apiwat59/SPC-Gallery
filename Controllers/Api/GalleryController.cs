using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Linq;
using Velzon.Models;

namespace Velzon.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class GalleryController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetGalleryItems()
        {
            try
            {
                string imagesDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images");
                var categoryFolders = Directory.GetDirectories(imagesDirectory);

                var galleryItems = categoryFolders.Select(categoryFolder =>
                {
                    string categoryName = Path.GetFileName(categoryFolder);
                    var imageFiles = Directory.GetFiles(categoryFolder, "*.*", SearchOption.TopDirectoryOnly)
                                             .Where(file => IsImageFile(file))
                                             .Select(imageFile => Path.GetFileName(imageFile));
                    return new GalleryCategory
                    {
                        Category = categoryName,
                        Images = imageFiles.ToList()
                    };
                }).ToList();

                return Ok(galleryItems);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        private bool IsImageFile(string filePath)
        {
            string extension = Path.GetExtension(filePath).ToLower();
            return extension == ".jpg" || extension == ".jpeg" || extension == ".png";
        }
    }
}

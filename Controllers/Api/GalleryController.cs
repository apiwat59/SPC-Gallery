using Microsoft.AspNetCore.Mvc;
using System;
using System.Drawing;
using System.IO;
using System.Linq;
using Velzon.Models;
using static System.Net.Mime.MediaTypeNames;

namespace Velzon.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class GalleryController : ControllerBase
    {
        public class ImageInfo
        {
            public string FileName { get; set; }
            public bool IsVertical { get; set; }
        }

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
                                             .Where(file => IsImageFile(file) && !IsVerticalImage(file)) // Exclude vertical images
                                             .Select(imageFile => Path.GetFileName(imageFile)) // Extract only filenames with extensions
                                             .OrderBy(imageFileName => imageFileName)
                                             .ToList();

                    return new GalleryCategory
                    {
                        Category = categoryName,
                        Images = imageFiles
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

        private bool IsVerticalImage(string filePath)
        {
            using (var imageStream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
            using (var image = System.Drawing.Image.FromStream(imageStream))
            {
                double aspectRatio = (double)image.Width / image.Height;
                return aspectRatio < 1.0; // If aspect ratio is less than 1, it's a vertical image
            }
        }
    }
}

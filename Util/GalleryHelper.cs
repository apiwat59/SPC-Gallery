using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Velzon.Models;

namespace Velzon.Util
{
    public class GalleryHelper
    {
        public static List<GalleryCategory> GetGalleryItems()
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

                return galleryItems;
            }
            catch (Exception ex)
            {
                // Handle exception or return null
                return null;
            }
        }

        private static bool IsImageFile(string filePath)
        {
            string extension = Path.GetExtension(filePath).ToLower();
            return extension == ".jpg" || extension == ".jpeg" || extension == ".png";
        }
    }
}
using Microsoft.AspNetCore.WebUtilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace WhiteBoard.Models
{
    public class RoomService
    {
        private const int BYTE_LENGTH = 16;

        RoomModel room = new RoomModel();

        /// <summary>
        /// Generate a fixed length token that can be used in url without endcoding it
        /// </summary>
        /// <returns></returns>
        public string GenerateRoomId()
        {
            // get secure array bytes
            byte[] secureArray = GenerateRandomBytes();

            // convert in an url safe string
            string urlToken = WebEncoders.Base64UrlEncode(secureArray);

            room.Id = urlToken;

            return room.Id;
        }

        /// <summary>
        /// Generate a cryptographically secure array of bytes with a fixed length
        /// </summary>
        /// <returns></returns>
        private byte[] GenerateRandomBytes()
        {
            using (RNGCryptoServiceProvider provider = new RNGCryptoServiceProvider())
            {
                byte[] byteArray = new byte[BYTE_LENGTH];
                provider.GetBytes(byteArray);

                return byteArray;
            }
        }

        /// <summary>
        /// Získá id roomky
        /// </summary>
        /// <returns></returns>
        private string GetRoomId()
        {
            return room.Id;
        }
    }
}

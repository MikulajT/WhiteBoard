using Microsoft.AspNetCore.WebUtilities;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;

namespace WhiteBoard.Models
{
    public class BoardService : IBoardService
    {
        private const int BYTE_LENGTH = 16;
        readonly private IBoardRepository repository;

        public BoardService(IBoardRepository boardRepository)
        {
            repository = boardRepository;
        }

        public BoardModel CreateBoard(string groupName)
        {
            BoardModel board = new BoardModel()
            {
                BoardId = groupName,
                Name = "",
                UniqueName = "",
                Pin = GenerateRoomPin(1000, 9999),
                Users = new List<UserModel>()
            };
            repository.AddBoard(board);
            return board;
        }

        /// <summary>
        /// Vygeneruje pin o určitém počtu cifer podle rozsahu.
        /// </summary>
        /// <param name="valueFrom"></param>
        /// <param name="valueTo"></param>
        /// <returns></returns>
        public int GenerateRoomPin(int valueFrom, int valueTo)
        {
            Random rdm = new Random();
            return rdm.Next(valueFrom, valueTo);
        }

        /// <summary>
        /// Generate a fixed length token that can be used in url without endcoding it
        /// </summary>
        /// <returns></returns>
        public string GenerateBoardId()
        {
            // get secure array bytes
            byte[] secureArray = GenerateRandomBytes();

            // convert in an url safe string
            string urlToken = WebEncoders.Base64UrlEncode(secureArray);

            return urlToken;
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
    }
}

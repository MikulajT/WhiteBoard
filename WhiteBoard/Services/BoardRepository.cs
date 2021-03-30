﻿using System.Collections.Generic;

namespace WhiteBoard.Models
{
    public class BoardRepository : IBoardRepository
    {
        private readonly IList<BoardModel> boards;

        public BoardRepository()
        {
            boards = new List<BoardModel>();
        }

        /// <summary>
        /// Přidá tabuly do listu
        /// </summary>
        /// <param name="board"></param>
        public void AddBoard(BoardModel board)
        {
            boards.Add(board);
        }

        /// <summary>
        /// Přidá uživatele k dané tabuli
        /// </summary>
        /// <param name="boardId"></param>
        /// <param name="user"></param>
        public void AddUser(string boardId, UserModel user)
        {
            FindBoardById(boardId).Users.Add(user);
        }

        /// <summary>
        /// Vyhledá tabuli podle id
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public BoardModel FindBoardById(string id)
        {
            return ((List<BoardModel>)boards).Find(x => x.BoardId == id);
        }

        /// <summary>
        /// Porovná, zda se shoduje zadaný pin s pinem dané tabule
        /// </summary>
        /// <param name="boardId"></param>
        /// <param name="pin"></param>
        /// <returns></returns>
        public bool CompareBoardByPin(string boardId, int pin)
        {
            return pin == FindBoardById(boardId).Pin;
        }
    }
}
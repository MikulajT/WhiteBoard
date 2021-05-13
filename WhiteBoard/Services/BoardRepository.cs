using System;
using System.Collections.Generic;
using System.Linq;

namespace WhiteBoard.Models
{
    public class BoardRepository : IBoardRepository
    {
        private readonly IList<BoardModel> _boards;
        private readonly IBoardService _boardService;
        private readonly object _objectLock = new object();

        public BoardRepository(IBoardService boardService)
        {
            _boards = new List<BoardModel>();
            _boardService = boardService;
        }

        public BoardModel CreateBoard(string groupName)
        {
            BoardModel board = new BoardModel()
            {
                BoardId = groupName,
                Name = "",
                UniqueName = "",
                Pin = _boardService.GenerateRoomPin(1000, 9999),
                Users = new List<UserModel>()
            };
            return board;
        }

        /// <summary>
        /// Přidá tabuly do listu
        /// </summary>
        /// <param name="board"></param>
        public void AddBoard(BoardModel board)
        {
            if (_boards.Count == 0)
            {
                board.UniqueName = "Board0";
            }
            else
            {
                int n = Int32.Parse(_boards[(_boards.Count - 1)].UniqueName.Split("Board")[1]);
                n++;
                board.UniqueName = "Board" + n.ToString();
            }

            lock (_objectLock)
            {
                _boards.Add(board);
            }
        }

        public UserModel CreateUser(string userId, string userConnectionId, BoardModel board, bool boardExisted)
        {
            UserModel user = new UserModel()
            {
                UserId = userId,
                Username = "Anonymous",
                Role = boardExisted ? UserRole.Editor : UserRole.Creator,
                Boards = new List<BoardModel>(),
                UserConnectionIds = new List<string>()
            };
            lock (_objectLock)
            {
                user.Boards.Add(board);
                user.UserConnectionIds.Add(userConnectionId);
            }
            return user;
        }

        public void AddUser(BoardModel board, UserModel user)
        {
            lock (_objectLock)
            {
                board.Users.Add(user);
            }
        }

        /// <summary>
        /// Vyhledá tabuli podle id
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public BoardModel FindBoardById(string boardId)
        {
            return ((List<BoardModel>)_boards).Find(x => x.BoardId == boardId);
        }

        public UserModel FindUserById(BoardModel board, string userId)
        {
            return board.Users.Find(x => x.UserId == userId);
        }

        public UserModel FindUserByConnectionId(BoardModel board, string userConnectionId)
        {
            foreach (var user in board.Users)
            {
                foreach (var connectionId in user.UserConnectionIds)
                {
                    if (connectionId == userConnectionId)
                    {
                        return user;
                    }
                }
            }
            return null;
        }

        public UserModel FindBoardCreator(string boardId)
        {
            return FindBoardById(boardId).Users.Find(x => x.Role == UserRole.Creator);
        }

        /// <summary>
        /// Vyhledá tabuli podle jmena
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public BoardModel FindBoardByName(string name)
        {
            return ((List<BoardModel>)_boards).Find(x => x.Name == name);
        }

        public BoardModel FindBoardByUniqueName(string uname)
        {
            return ((List<BoardModel>)_boards).Find(x => x.UniqueName == uname);
        }

        public BoardModel FindBoardByUserConnectionId(string userConnectionId)
        {
            foreach (var board in _boards)
            {
                foreach (var user in board.Users)
                {
                    foreach (var connectionId in user.UserConnectionIds)
                        if (connectionId == userConnectionId)
                        {
                            return board;
                        }
                }
            }
            return null;
        }

        public void RemoveBoard(BoardModel board)
        {
            lock (_objectLock)
            {
                _boards.Remove(board);
            }
        }

        public void ChangeBoardname(string boardId, string changedBoardname)
        {
            FindBoardById(boardId).Name = changedBoardname;
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

        public bool isBoardEmpty(BoardModel board)
        {
            return board.Users.All(user => user.UserConnectionIds.Count == 0);
        }
    }
}

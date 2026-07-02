using System;
using SDM.Domain.Enums;

namespace SDM.Application.Exceptions
{
    public class CommandNotSupportedException : Exception
    {
        public string CommandType { get; }
        public ManagementMode ManagementMode { get; }

        public CommandNotSupportedException(string commandType, ManagementMode managementMode)
            : base($"Command '{commandType}' requires Device Owner and is not supported on this device (current mode: {managementMode}).")
        {
            CommandType = commandType;
            ManagementMode = managementMode;
        }
    }
}

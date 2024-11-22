const machine = {
    states: {
        idle: {
            initial: true,
            on: {
                "CALL_TOOL": 'calling_tools',
            }
        },
        calling_tools: {
            
        }
    }
}